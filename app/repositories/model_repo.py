import logging

from sqlalchemy.orm import Session
from app.models.model import Model

from app.models.product_code import ProductCode

logger = logging.getLogger(__name__)


def get_models_by_product_code(db: Session, product_code_id: int):
    # Check if the product_code is active
    product_code_obj = db.query(ProductCode).filter(ProductCode.id == product_code_id).first()
    if product_code_obj and getattr(product_code_obj, "status", "active") != "active":
        logger.warning("Product code id=%s is inactive. No models will be loaded.", product_code_id)
        return []

    models = (
        db.query(Model)
        .filter(Model.product_code_id == product_code_id)
        .filter(Model.is_active == True)
        .order_by(Model.id.desc())
        .all()
    )
    logger.debug("get_models_by_product_code | product_code_id=%s count=%s", product_code_id, len(models))
    return models