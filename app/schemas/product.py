from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum
from datetime import datetime


class ProductType(str, Enum):
    SELF = "self"
    COMPETITOR = "competitor"


def _normalize_product_type(value):
    if value is None:
        return value
    if isinstance(value, ProductType):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "self":
            return ProductType.SELF
        if normalized in {"self", "competitor"}:
            return normalized
    return value


class ProductCreate(BaseModel):
    product_code_id: int
    product_name: str = Field(..., min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    ai_code: Optional[str] = Field(None, max_length=50)
    type: Optional[ProductType] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value):
        return _normalize_product_type(value)


class ProductUpdate(BaseModel):
    product_code_id: Optional[int] = None
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    ai_code: Optional[str] = Field(None, max_length=50)
    type: Optional[ProductType] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value):
        return _normalize_product_type(value)


class ProductResponse(BaseModel):
    id: int
    product_code_id: Optional[int]
    product_name: str
    brand: Optional[str]
    category: Optional[str]
    ai_code: Optional[str]
    type: Optional[ProductType]
    created_at: datetime

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value):
        return _normalize_product_type(value)

    class Config:
        from_attributes = True


class BulkProductResponse(BaseModel):
    created: List[ProductResponse]
    skipped: List[str]