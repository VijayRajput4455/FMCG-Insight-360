from sqlalchemy.orm import Session
from app.models.audit_result import AuditResult


def create_audit(db: Session, product_code_id: int, image_path: str):
    audit = AuditResult(
        product_code_id=product_code_id,
        image_path=image_path,
        status="pending"
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


def update_audit_status(db: Session, audit_id: int, status: str, result_json=None, error_message=None):
    audit = db.query(AuditResult).filter(AuditResult.id == audit_id).first()

    if not audit:
        return None

    audit.status = status

    if result_json:
        audit.result_json = result_json

    if error_message:
        audit.error_message = error_message

    db.commit()
    db.refresh(audit)

    return audit