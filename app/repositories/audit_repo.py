import logging

from sqlalchemy.orm import Session
from app.models.audit_result import AuditResult

logger = logging.getLogger(__name__)


def create_audit(db: Session, product_code_id: int, image_path: str):
    audit = AuditResult(
        product_code_id=product_code_id,
        image_path=image_path,
        status="pending"
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    logger.debug("Audit row created | audit_id=%s product_code_id=%s", audit.id, product_code_id)
    return audit


def update_audit_status(db: Session, audit_id: int, status: str, result_json=None, error_message=None):
    audit = db.query(AuditResult).filter(AuditResult.id == audit_id).first()

    if not audit:
        logger.warning("update_audit_status: audit_id=%s not found", audit_id)
        return None

    audit.status = status

    if result_json:
        audit.result_json = result_json

    if error_message:
        audit.error_message = error_message

    db.commit()
    db.refresh(audit)
    logger.debug("Audit status updated | audit_id=%s status=%s", audit_id, status)
    return audit