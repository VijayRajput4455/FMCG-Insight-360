from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    product_code_id = Column(
        Integer,
        ForeignKey("product_codes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_name = Column(String(100), unique=True, nullable=False, index=True)
    brand = Column(String(100))
    category = Column(String(100))
    ai_code = Column(String(50))
    type = Column(String(20))   # own / competitor

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)

    product_code = relationship("ProductCode")