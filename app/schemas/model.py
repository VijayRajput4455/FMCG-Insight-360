from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ModelCreate(BaseModel):
    product_code_id: int = Field(..., gt=0)
    model_name: str = Field(..., min_length=1, max_length=100)
    model_path: str = Field(..., min_length=1, max_length=500)
    image_size: Optional[int] = Field(1280, ge=320, le=2048)
    conf_threshold: Optional[float] = Field(0.25, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(0.45, ge=0.0, le=1.0)

    @field_validator('conf_threshold', 'iou_threshold')
    @classmethod
    def validate_thresholds(cls, v):
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError('Threshold must be between 0.0 and 1.0')
        return v


class ModelUpdate(BaseModel):
    product_code_id: Optional[int] = Field(None, gt=0)
    model_name: Optional[str] = Field(None, min_length=1, max_length=100)
    model_path: Optional[str] = Field(None, min_length=1, max_length=500)
    image_size: Optional[int] = Field(None, ge=320, le=2048)
    conf_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

    @field_validator('conf_threshold', 'iou_threshold')
    @classmethod
    def validate_thresholds(cls, v):
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError('Threshold must be between 0.0 and 1.0')
        return v


class ModelResponse(BaseModel):
    id: int
    product_code_id: int
    model_name: str
    model_path: str
    image_size: int
    conf_threshold: float
    iou_threshold: float
    created_at: datetime

    class Config:
        from_attributes = True