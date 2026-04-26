import logging

from sqlalchemy.orm import Session
from app.models.model import Model

logger = logging.getLogger(__name__)


def get_models_by_product_code(db: Session, product_code_id: int):
    models = (
        db.query(Model)
        .filter(Model.product_code_id == product_code_id)
        .order_by(Model.id.desc())
        .all()
    )
    logger.debug("get_models_by_product_code | product_code_id=%s count=%s", product_code_id, len(models))
    return models