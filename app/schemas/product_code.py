from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductCodeCreate(BaseModel):
    product_code: str = Field(..., min_length=1, max_length=50, pattern="^[A-Za-z0-9_-]+$")
    description: Optional[str] = Field(None, max_length=500)


class ProductCodeUpdate(BaseModel):
    product_code: Optional[str] = Field(None, min_length=1, max_length=50, pattern="^[A-Za-z0-9_-]+$")
    description: Optional[str] = Field(None, max_length=500)


class ProductCodeResponse(BaseModel):
    id: int
    product_code: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True