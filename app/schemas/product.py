from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum
from datetime import datetime


class ProductType(str, Enum):
    OWN = "own"
    COMPETITOR = "competitor"


class ProductCreate(BaseModel):
    product_code_id: int
    product_name: str = Field(..., min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    ai_code: Optional[str] = Field(None, max_length=50)
    type: Optional[ProductType] = None


class ProductUpdate(BaseModel):
    product_code_id: Optional[int] = None
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    ai_code: Optional[str] = Field(None, max_length=50)
    type: Optional[ProductType] = None


class ProductResponse(BaseModel):
    id: int
    product_code_id: Optional[int]
    product_name: str
    brand: Optional[str]
    category: Optional[str]
    ai_code: Optional[str]
    type: Optional[ProductType]
    created_at: datetime

    class Config:
        from_attributes = True


class BulkProductResponse(BaseModel):
    created: List[ProductResponse]
    skipped: List[str]