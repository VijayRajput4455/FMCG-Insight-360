import logging
from collections import defaultdict

import cv2
import torch
from sqlalchemy.orm import Session

from app.models.product import Product

logger = logging.getLogger(__name__)


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
        try:
            detection_coordinates = []

            if not valid_product_names:
                logger.error("Invalid product code: %s", product_code)
                return image, {"ERROR-Invalid Product Code": 0}, 0, []

            logger.info("Valid products for '%s': %s", product_code, valid_product_names)
            device = self._get_prediction_device()
            logger.info("Running inference on %s...", device)

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
                    logger.warning("No detections from model.")
                    continue

                detected_labels = [
                    self._get_class_name(model, int(box.cls.item())) for box in result.boxes
                ]

                unique_detected_labels = set(detected_labels)
                logger.info("Detected classes: %s", unique_detected_labels)

                if not any(label in valid_product_names for label in unique_detected_labels):
                    logger.warning("No valid products detected.")
                    return image, {"No products detected for given product code": 0}, 0, []

                for box in result.boxes:
                    class_label = self._get_class_name(model, int(box.cls.item()))

                    if class_label not in valid_product_names:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                    detection_coordinates.append({class_label: (x1, y1, x2, y2)})
                    product_counts[class_label] = product_counts.get(class_label, 0) + 1

                    if class_label in self_products_list:
                        box_color = (0, 0, 255)
                    elif class_label in competitor_products_list:
                        box_color = (255, 0, 0)
                    else:
                        box_color = (0, 255, 0)

                    cv2.rectangle(image, (x1, y1), (x2, y2), box_color, 2)

                    font_face = cv2.FONT_HERSHEY_SCRIPT_COMPLEX
                    font_scale = max(0.7, min(image.shape[:2]) / 2000)
                    font_thickness = int(max(1, font_scale * 2))
                    label_text = class_label

                    (text_width, text_height), baseline = cv2.getTextSize(
                        label_text,
                        font_face,
                        font_scale,
                        font_thickness,
                    )

                    padding = 10
                    text_x = x1 + padding
                    text_y = max(y1, text_height + padding)

                    box_x1 = x1
                    box_y1 = text_y - text_height - padding
                    box_x2 = x1 + text_width + padding * 2
                    box_y2 = text_y - baseline + padding // 2

                    cv2.rectangle(
                        image,
                        (box_x1, box_y1),
                        (box_x2, box_y2),
                        box_color,
                        -1,
                    )

                    cv2.putText(
                        image,
                        label_text,
                        (text_x, text_y - padding),
                        font_face,
                        font_scale,
                        (255, 255, 255),
                        font_thickness,
                        cv2.LINE_AA,
                    )

            if not product_counts:
                logger.warning("No valid products after filtering.")
                return image, {"No products detected": 0}, 0, []

            total_detections = sum(product_counts.values())
            logger.info("Detection complete. Total valid detections: %d", total_detections)

            return image, product_counts, total_detections, detection_coordinates

        except Exception as e:
            logger.exception("Detection pipeline failed: %s", str(e))
            return image, {"ERROR-Detection Failure": 0}, 0, []

    def run_inference(self, db: Session, models, image_path: str, product_code_id: int):
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

        all_counts = defaultdict(int)
        all_coordinates = []
        annotated_image = image.copy()

        # Initialize counts
        self_count = 0
        competition_count = 0

        # Load active products to build the product_map for O(1) attribute lookup
        products_list = db.query(Product).filter(Product.product_code_id == product_code_id).filter(Product.status == "active").all()
        product_map = {p.product_name: p for p in products_list}

        for bundle in models:
            meta = bundle["meta"]
            image_size = getattr(meta, "image_size", 1280) or 1280
            conf_threshold = getattr(meta, "conf_threshold", 0.20) or 0.20
            iou_threshold = getattr(meta, "iou_threshold", 0.20) or 0.20

            try:
                annotated_image, product_counts, _, coordinates = self.detect_products_by_code(
                    image=annotated_image,
                    product_code=str(product_code_id),
                    model=bundle["model"],
                    valid_product_names=valid_products,
                    self_products_list=self_products,
                    competitor_products_list=competitor_products,
                    image_size=image_size,
                    conf_thres=conf_threshold,
                    iou_thres=iou_threshold,
                )

                #  Extracting Brand,Category and AI Codes
                for key, value in product_counts.items():
                    if key.startswith("ERROR-") or key.startswith("No products"):
                        continue
                    
                    brand_cat_ai = self._get_brand_category_and_ai_codes(key, product_map)

                    if key in self_products:
                        self_count += value
                        product_type = "Self"
                    elif key in competitor_products:
                        competition_count += value
                        product_type = "Competition"
                    else:
                        product_type = ""

                    all_counts[key] += value

                all_coordinates.extend(coordinates)
            except Exception:
                model_name = getattr(bundle.get("meta"), "model_name", "unknown")
                logger.exception("Inference failed for model=%s", model_name)

        if not all_counts:
            logger.warning("No detections produced by any model")
            return {
                "counts": {"No products detected": 0},
                "total_product_count": 0,
                "total_self_count": 0,
                "total_competition_count": 0,
                "brand_counts": [],
                "detected_products": [],
                "products": [{"name":"","count":0,"brand":"","category":"","product_type":"","ai_code":""}],
                "detection_coordinates": [],
                "annotated_image": annotated_image,
            }

        total = sum(all_counts.values())

        # Build detected_products (strings for React) and products (detailed dicts)
        brand_to_count = defaultdict(int)
        detected_products_names = []
        products_detailed = []

        for key, value in all_counts.items():
            prod = product_map.get(key)
            brand_name = prod.brand if prod else None
            if brand_name:
                brand_to_count[brand_name] += value
            
            brand_cat_ai = self._get_brand_category_and_ai_codes(key, product_map)
            if key in self_products:
                product_type = "Self"
            elif key in competitor_products:
                product_type = "Competition"
            else:
                product_type = ""

            detected_products_names.append(key)

            if brand_cat_ai is not None:
                products_detailed.append({
                    "name": key,
                    "count": value,
                    "brand": brand_cat_ai[0],
                    "category": brand_cat_ai[1],
                    "product_type": product_type,
                    "ai_code": brand_cat_ai[2]
                })
            else:
                products_detailed.append({
                    "name": key,
                    "count": value,
                    "brand": "",
                    "category": "",
                    "product_type": product_type,
                    "ai_code": ""
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