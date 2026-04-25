import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AuditResult(Base):
    __tablename__ = "audit_results"

    id = Column(Integer, primary_key=True)

    product_code_id = Column(
        Integer,
        ForeignKey("product_codes.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    image_path = Column(String, nullable=True)

    result_json = Column(JSONB, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default=AuditStatus.PENDING.value,
        index=True,
    )

    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)

    product_code = relationship("ProductCode")

    __table_args__ = (
        Index("idx_audit_status_created", "status", "created_at"),
    )