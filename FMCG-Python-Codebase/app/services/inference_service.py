import logging
from collections import defaultdict

import cv2
import torch
from sqlalchemy.orm import Session

from app.models.product import Product

logger = logging.getLogger(__name__)


def _compute_iou(box1: list[int], box2: list[int]) -> float:
    """Compute Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    if inter_area == 0:
        return 0.0

    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area

    if union_area <= 0:
        return 0.0

    return inter_area / float(union_area)


def _apply_cross_model_nms(raw_detections: list[dict], iou_threshold: float = 0.40) -> list[dict]:
    """
    Perform cross-model Non-Maximum Suppression (NMS) across detections from multiple models.
    Deduplicates overlapping bounding boxes from different models for the SAME product label,
    while preserving all distinct detected objects (e.g., dog, face, person).
    """
    if not raw_detections:
        return []

    # Sort detections by confidence score descending
    sorted_dets = sorted(raw_detections, key=lambda d: d.get("confidence", 0.0), reverse=True)
    kept_detections = []

    for current in sorted_dets:
        keep = True
        for kept in kept_detections:
            iou = _compute_iou(current["bbox"], kept["bbox"])
            # Suppress duplicate box only if it's the SAME product label with high overlap
            if current["label"] == kept["label"] and iou > iou_threshold:
                keep = False
                break

        if keep:
            kept_detections.append(current)

    return kept_detections


class InferenceService:
    def _get_prediction_device(self) -> str:
        return "cuda:0" if torch.cuda.is_available() else "cpu"

    def _read_image(self, image_path: str):
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Invalid image path or format: {image_path}")
        return image

    def _get_class_name(self, model, class_id: int) -> str:
        names = model.names
        if isinstance(names, dict):
            return str(names.get(class_id, class_id))
        return str(names[class_id])

    def _get_product_sets(self, db: Session, product_code_id: int):
        products = (
            db.query(Product)
            .filter(Product.product_code_id == product_code_id)
            .filter(Product.status == "active")
            .all()
        )

        valid_product_names = {p.product_name for p in products}
        self_products = {
            p.product_name
            for p in products
            if (p.type or "").strip().lower() in {"self", "own"}
        }
        competitor_products = {
            p.product_name
            for p in products
            if (p.type or "").strip().lower() in {"competitor", "competition"}
        }

        return valid_product_names, self_products, competitor_products

    def _get_brand_category_and_ai_codes(self, product_name: str, product_map: dict):
        prod = product_map.get(product_name)
        if prod:
            return (
                prod.brand or "",
                prod.category or "",
                prod.ai_code or "",
            )
        return None

    def detect_products_by_code(
        self,
        image,
        product_code,
        model,
        valid_product_names,
        self_products_list,
        competitor_products_list,
        image_size=1280,
        conf_thres=0.20,
        iou_thres=0.20,
    ):
        """Single model detection helper (maintained for backward compatibility)."""
        try:
            detection_coordinates = []

            if not valid_product_names:
                logger.error("Invalid product code: %s", product_code)
                return image, {"ERROR-Invalid Product Code": 0}, 0, []

            device = self._get_prediction_device()
            results = model.predict(
                source=image,
                imgsz=image_size,
                conf=conf_thres,
                iou=iou_thres,
                device=device,
                verbose=False,
            )

            product_counts = {}
            for result in results:
                if result.boxes is None or len(result.boxes) == 0:
                    continue

                for box in result.boxes:
                    class_label = self._get_class_name(model, int(box.cls.item()))
                    if class_label not in valid_product_names:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    detection_coordinates.append({class_label: (x1, y1, x2, y2)})
                    product_counts[class_label] = product_counts.get(class_label, 0) + 1

                    box_color = (0, 0, 255) if class_label in self_products_list else (255, 0, 0) if class_label in competitor_products_list else (0, 255, 0)
                    cv2.rectangle(image, (x1, y1), (x2, y2), box_color, 2)

            total_detections = sum(product_counts.values())
            return image, product_counts, total_detections, detection_coordinates

        except Exception as e:
            logger.exception("Detection pipeline failed: %s", str(e))
            return image, {"ERROR-Detection Failure": 0}, 0, []

    def run_inference(self, db: Session, models, image_path: str, product_code_id: int):
        """
        Runs multi-model sequential inference across all active models mapped to a product_code_id.
        Deduplicates bounding boxes across models using cross-model NMS and produces ONE unified output image.
        """
        image = self._read_image(image_path)
        valid_products, self_products, competitor_products = self._get_product_sets(
            db,
            product_code_id,
        )

        if not valid_products:
            logger.error("Invalid product code id or no mapped products: %s", product_code_id)
            return {
                "error": "Invalid product code or no products mapped",
                "counts": {"ERROR-Invalid Product Code": 0},
                "total": 0,
                "detection_coordinates": [],
            }

        # Build product map for metadata extraction
        products_list = (
            db.query(Product)
            .filter(Product.product_code_id == product_code_id)
            .filter(Product.status == "active")
            .all()
        )
        product_map = {p.product_name: p for p in products_list}

        raw_detections = []
        model_names_list = []
        device = self._get_prediction_device()

        # Step 1: Sequential inference pass across all active models mapped to product code
        for bundle in models:
            meta = bundle.get("meta")
            model_obj = bundle.get("model")
            m_name = getattr(meta, "model_name", "YOLO") or "YOLO"
            model_names_list.append(m_name)

            image_size = getattr(meta, "image_size", 1280) or 1280
            conf_threshold = getattr(meta, "conf_threshold", 0.20) or 0.20
            iou_threshold = getattr(meta, "iou_threshold", 0.20) or 0.20

            try:
                logger.info("Running sequential inference for model='%s' (imgsz=%s conf=%s)", m_name, image_size, conf_threshold)
                results = model_obj.predict(
                    source=image,
                    imgsz=image_size,
                    conf=conf_threshold,
                    iou=iou_threshold,
                    device=device,
                    verbose=False,
                )

                for result in results:
                    if result.boxes is None or len(result.boxes) == 0:
                        continue

                    for box in result.boxes:
                        class_label = self._get_class_name(model_obj, int(box.cls.item()))
                        if class_label not in valid_products:
                            continue

                        conf = float(box.conf.item()) if box.conf is not None else 0.5
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                        raw_detections.append({
                            "label": class_label,
                            "bbox": [x1, y1, x2, y2],
                            "confidence": conf,
                            "model_name": m_name,
                        })
            except Exception as model_err:
                logger.exception("Inference failed for model='%s': %s", m_name, model_err)

        logger.info(
            "Raw detections collected across %d active model(s): count=%d",
            len(models),
            len(raw_detections),
        )

        # Step 2: Cross-Model Non-Maximum Suppression (NMS) & Box Merging
        kept_detections = _apply_cross_model_nms(raw_detections, iou_threshold=0.40)
        logger.info("Deduplicated detections after cross-model NMS: count=%d", len(kept_detections))

        # Step 3: Single Unified Image Rendering
        annotated_image = image.copy()
        all_counts = defaultdict(int)
        all_coordinates = []
        self_count = 0
        competition_count = 0
        conf_sum = 0.0

        for det in kept_detections:
            class_label = det["label"]
            x1, y1, x2, y2 = det["bbox"]
            conf_val = det["confidence"]
            m_source = det["model_name"]

            all_counts[class_label] += 1
            conf_sum += conf_val
            all_coordinates.append({
                class_label: (x1, y1, x2, y2),
                "confidence": round(conf_val, 4),
                "model": m_source,
            })

            if class_label in self_products:
                self_count += 1
                box_color = (0, 180, 0) # Green for Self
            elif class_label in competitor_products:
                competition_count += 1
                box_color = (0, 0, 225) # Red for Competitor
            else:
                box_color = (255, 140, 0) # Orange for General

            # Draw bounding box
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), box_color, 2)

            # Draw label background box & text badge
            font_face = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = max(0.5, min(image.shape[:2]) / 2200)
            font_thickness = max(1, int(font_scale * 2))
            label_text = f"{class_label} ({conf_val * 100:.0f}%)"

            (text_width, text_height), baseline = cv2.getTextSize(
                label_text, font_face, font_scale, font_thickness
            )

            padding = 6
            text_x = x1 + padding
            text_y = max(y1, text_height + padding)

            box_x1 = x1
            box_y1 = text_y - text_height - padding
            box_x2 = x1 + text_width + padding * 2
            box_y2 = text_y - baseline + padding // 2

            cv2.rectangle(
                annotated_image,
                (box_x1, box_y1),
                (box_x2, box_y2),
                box_color,
                -1,
            )

            cv2.putText(
                annotated_image,
                label_text,
                (text_x, text_y - padding // 2),
                font_face,
                font_scale,
                (255, 255, 255),
                font_thickness,
                cv2.LINE_AA,
            )

        combined_model_name = " + ".join(dict.fromkeys(model_names_list)) if model_names_list else "YOLO"

        if not kept_detections:
            logger.warning("No valid detections produced across %d models", len(models))
            return {
                "counts": {"No products detected": 0},
                "total_product_count": 0,
                "total_self_count": 0,
                "total_competition_count": 0,
                "brand_counts": [],
                "detected_products": [],
                "products": [{"name": "", "count": 0, "brand": "", "category": "", "product_type": "", "ai_code": ""}],
                "detection_coordinates": [],
                "annotated_image": annotated_image,
                "model_name": combined_model_name,
                "confidence": 0.0,
            }

        total = len(kept_detections)
        avg_confidence = round(conf_sum / total, 4) if total > 0 else 0.0

        # Step 4: Build brand counts and detailed products lists
        brand_to_count = defaultdict(int)
        detected_products_names = list(all_counts.keys())
        products_detailed = []

        for key, count_val in all_counts.items():
            prod = product_map.get(key)
            brand_name = prod.brand if prod else None
            if brand_name:
                brand_to_count[brand_name] += count_val

            brand_cat_ai = self._get_brand_category_and_ai_codes(key, product_map)
            product_type = "Self" if key in self_products else "Competition" if key in competitor_products else ""

            if brand_cat_ai is not None:
                products_detailed.append({
                    "name": key,
                    "count": count_val,
                    "brand": brand_cat_ai[0],
                    "category": brand_cat_ai[1],
                    "product_type": product_type,
                    "ai_code": brand_cat_ai[2],
                })
            else:
                products_detailed.append({
                    "name": key,
                    "count": count_val,
                    "brand": "",
                    "category": "",
                    "product_type": product_type,
                    "ai_code": "",
                })

        brand_counts = [{"brand": brand, "count": cnt} for brand, cnt in brand_to_count.items()]

        return {
            "counts": dict(all_counts),
            "total_product_count": total,
            "total_self_count": self_count,
            "total_competition_count": competition_count,
            "brand_counts": brand_counts,
            "detected_products": detected_products_names,
            "products": products_detailed,
            "detection_coordinates": all_coordinates,
            "annotated_image": annotated_image,
            "model_name": combined_model_name,
            "confidence": avg_confidence,
        }

    def merge_predictions(self, predictions):
        if isinstance(predictions, dict) and "counts" in predictions:
            return predictions["counts"]

        result = defaultdict(int)
        for pred in predictions:
            label = pred["label"]
            result[label] += 1
        return dict(result)


_inference_service = InferenceService()


def detect_products_by_code(*args, **kwargs):
    return _inference_service.detect_products_by_code(*args, **kwargs)


def run_inference(db: Session, models, image_path: str, product_code_id: int):
    return _inference_service.run_inference(db, models, image_path, product_code_id)


def merge_predictions(predictions):
    return _inference_service.merge_predictions(predictions)