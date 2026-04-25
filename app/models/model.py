from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Model(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)

    product_code_id = Column(
        Integer,
        ForeignKey("product_codes.id", ondelete="CASCADE"),
        nullable=False
    )

    model_name = Column(String(100), nullable=False)
    model_path = Column(String, nullable=False)

    # Inference Config
    image_size = Column(Integer, default=1280)
    conf_threshold = Column(Float, default=0.25)
    iou_threshold = Column(Float, default=0.45)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)

    # Relationship
    product_code = relationship("ProductCode", back_populates="models")