from sqlalchemy.orm import Session
from app.models.product import Product


def get_products_by_names(db: Session, product_names: list[str]):
    return (
        db.query(Product)
        .filter(Product.product_name.in_(product_names))
        .all()
    )