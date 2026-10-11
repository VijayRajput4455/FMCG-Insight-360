import logging

from sqlalchemy.orm import Session
from app.models.product import Product

logger = logging.getLogger(__name__)


def get_products_by_names(db: Session, product_names: list[str]):
    products = (
        db.query(Product)
        .filter(Product.product_name.in_(product_names))
        .all()
    )
    logger.debug("get_products_by_names | queried=%s found=%s", len(product_names), len(products))
    return products