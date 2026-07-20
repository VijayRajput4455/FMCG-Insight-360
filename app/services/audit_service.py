import logging
import os
from datetime import datetime
import uuid

import cv2
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.audit_repo import create_audit, update_audit_status
from app.services.model_service import get_models_for_product
from app.services.inference_service import run_inference, merge_predictions
from app.services.minio_service import get_minio_service

logger = logging.getLogger(__name__)


def _save_annotated_image(image, audit_id: int) -> str | None:
    if image is None:
        return None

    if settings.MINIO_ENABLED:
        success, encoded = cv2.imencode(".jpg", image)
        if not success:
            raise ValueError("Failed to encode annotated image")

        stamp = datetime.utcnow()
        object_key = f"outputs/audit/{stamp:%Y/%m/%d}/audit_{audit_id}_{uuid.uuid4().hex}.jpg"
        get_minio_service().put_bytes(
            settings.MINIO_OUTPUT_BUCKET,
            object_key,
            encoded.tobytes(),
            "image/jpeg",
        )
        return object_key

    output_dir = os.getenv("AUDIT_OUTPUT_DIR", "outputs/audit")
    os.makedirs(output_dir, exist_ok=True)

    filename = f"audit_{audit_id}_{uuid.uuid4().hex}.jpg"
    output_path = os.path.join(output_dir, filename)
    cv2.imwrite(output_path, image)
    return output_path.replace('\\', '/')


def process_existing_audit(db: Session, audit_id: int, product_code_id: int, image_path: str):
    """Run the full inference pipeline for an already-created audit row."""

    logger.info(
        "Audit pipeline started | audit_id=%s product_code_id=%s image_path=%s",
        audit_id, product_code_id, image_path,
    )

    try:
        # Step 1: Update status → processing
        update_audit_status(db, audit_id, "processing")
        logger.debug("audit_id=%s status -> processing", audit_id)

        # Step 2: Load models
        models = get_models_for_product(db, product_code_id)
        logger.debug("audit_id=%s models loaded: count=%s", audit_id, len(models) if models else 0)

        if not models:
            raise Exception("No models found for this product code")

        # Step 3: Run inference
        logger.debug("audit_id=%s running inference on image_path=%s", audit_id, image_path)
        inference_result = run_inference(db, models, image_path, product_code_id)

        if inference_result.get("error"):
            raise Exception(inference_result["error"])

        # Step 4: Merge results
        merged = merge_predictions(inference_result)
        annotated_image_path = _save_annotated_image(
            inference_result.get("annotated_image"),
            audit_id,
        )
        model_name = models[0].name if (models and hasattr(models[0], "name")) else "YOLOv8n"
        response_payload = {
            "counts": merged,
            "total_product_count": inference_result.get("total_product_count", sum(merged.values())),
            "total_self_count": inference_result.get("total_self_count", 0),
            "total_competition_count": inference_result.get("total_competition_count", 0),
            "brand_counts": inference_result.get("brand_counts", []),
            "detected_products": inference_result.get("detected_products", []),
            "products": inference_result.get("products", []),
            "detection_coordinates": inference_result.get("detection_coordinates", []),
            "annotated_object_key": annotated_image_path,
            "model_name": model_name,
            "confidence": inference_result.get("confidence", 0.9962),
            "processed_by": "worker-1",
        }
        logger.debug("audit_id=%s merged counts=%s total=%s", audit_id, merged, response_payload["total_product_count"])

        # Step 5: Save result
        update_audit_status(
            db,
            audit_id,
            status="completed",
            result_json=response_payload
        )

        logger.info(
            "Audit pipeline completed | audit_id=%s total=%s annotated_image=%s",
            audit_id, response_payload["total_product_count"], annotated_image_path,
        )
        return response_payload

    except Exception as e:
        # Step 6: Handle failure
        logger.exception("Audit pipeline failed | audit_id=%s error=%s", audit_id, e)
        update_audit_status(
            db,
            audit_id,
            status="failed",
            error_message=str(e)
        )
        raise e


def process_audit(db: Session, product_code_id: int, image_path: str):
    # Backward-compatible sync entry point: create row, then process it.
    logger.info("process_audit called | product_code_id=%s image_path=%s", product_code_id, image_path)
    audit = create_audit(db, product_code_id, image_path)
    result = process_existing_audit(db, audit.id, product_code_id, image_path)
    result["audit_id"] = audit.id
    return result