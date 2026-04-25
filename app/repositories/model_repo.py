from sqlalchemy.orm import Session
from app.models.model import Model


def get_models_by_product_code(db: Session, product_code_id: int):
    return (
        db.query(Model)
        .filter(Model.product_code_id == product_code_id)
        .order_by(Model.id.desc())
        .all()
    )