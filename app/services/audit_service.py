import os
import uuid

import cv2
from sqlalchemy.orm import Session

from app.repositories.audit_repo import create_audit, update_audit_status
from app.services.model_service import get_models_for_product
from app.services.inference_service import run_inference, merge_predictions


def _save_annotated_image(image, audit_id: int) -> str | None:
    if image is None:
        return None

    output_dir = os.getenv("AUDIT_OUTPUT_DIR", "outputs/audit")
    os.makedirs(output_dir, exist_ok=True)

    filename = f"audit_{audit_id}_{uuid.uuid4().hex}.jpg"
    output_path = os.path.join(output_dir, filename)
    cv2.imwrite(output_path, image)
    return output_path


def process_existing_audit(db: Session, audit_id: int, product_code_id: int, image_path: str):
    """Run the full inference pipeline for an already-created audit row."""

    try:
        # Step 1: Update status → processing
        update_audit_status(db, audit_id, "processing")

        # Step 2: Load models
        models = get_models_for_product(db, product_code_id)

        if not models:
            raise Exception("No models found for this product code")

        # Step 3: Run inference
        inference_result = run_inference(db, models, image_path, product_code_id)

        if inference_result.get("error"):
            raise Exception(inference_result["error"])

        # Step 4: Merge results
        merged = merge_predictions(inference_result)
        annotated_image_path = _save_annotated_image(
            inference_result.get("annotated_image"),
            audit_id,
        )
        response_payload = {
            "counts": merged,
            "total": inference_result.get("total", sum(merged.values())),
            "detection_coordinates": inference_result.get("detection_coordinates", []),
            "annotated_image_path": annotated_image_path,
        }

        # Step 5: Save result
        update_audit_status(
            db,
            audit_id,
            status="completed",
            result_json=response_payload
        )

        return response_payload

    except Exception as e:
        # Step 6: Handle failure
        update_audit_status(
            db,
            audit_id,
            status="failed",
            error_message=str(e)
        )
        raise e


def process_audit(db: Session, product_code_id: int, image_path: str):
    # Backward-compatible sync entry point: create row, then process it.
    audit = create_audit(db, product_code_id, image_path)
    result = process_existing_audit(db, audit.id, product_code_id, image_path)
    result["audit_id"] = audit.id
    return result