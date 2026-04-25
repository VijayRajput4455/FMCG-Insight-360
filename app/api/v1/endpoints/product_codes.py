from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.product_code import ProductCode
from app.models.model import Model
from app.schemas.product_code import (
    ProductCodeCreate,
    ProductCodeUpdate,
    ProductCodeResponse
)
from app.schemas.error import ErrorResponse

_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Bad request"},
    404: {"model": ErrorResponse, "description": "Not found"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}

router = APIRouter()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

@router.post("/", response_model=ProductCodeResponse, responses={400: _ERROR_RESPONSES[400], 422: _ERROR_RESPONSES[422]}, summary="Create a product code")
def create_product_code(data: ProductCodeCreate, db: Session = Depends(get_db)):
    existing = db.query(ProductCode).filter(
        ProductCode.product_code == data.product_code
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Product code already exists")

    obj = ProductCode(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)

    logger.info(f"Created product_code={obj.product_code}")
    return obj


# ─────────────────────────────────────────────
# READ
# ─────────────────────────────────────────────

@router.get("/", response_model=list[ProductCodeResponse], responses={422: _ERROR_RESPONSES[422]}, summary="List all product codes")
def get_all_product_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    return db.query(ProductCode).offset(skip).limit(limit).all()


@router.get("/search/", response_model=list[ProductCodeResponse], responses={422: _ERROR_RESPONSES[422]}, summary="Search product codes by partial name")
def search_product_codes(
    q: str = Query(..., min_length=1, description="Partial product code to search"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    results = (
        db.query(ProductCode)
        .filter(ProductCode.product_code.ilike(f"%{q}%"))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return results


@router.get("/by-code/{product_code}", response_model=ProductCodeResponse, responses={404: _ERROR_RESPONSES[404]}, summary="Get product code by name")
def get_by_code(product_code: str, db: Session = Depends(get_db)):
    obj = db.query(ProductCode).filter(
        ProductCode.product_code == product_code
    ).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    return obj


@router.get("/{code_id}", response_model=ProductCodeResponse, responses={404: _ERROR_RESPONSES[404]}, summary="Get product code by ID")
def get_product_code(code_id: int, db: Session = Depends(get_db)):
    obj = db.query(ProductCode).filter(ProductCode.id == code_id).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    return obj


# ─────────────────────────────────────────────
# UPDATE
# ─────────────────────────────────────────────

@router.put("/by-code/{product_code}", response_model=ProductCodeResponse, responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]}, summary="Update product code by name")
def update_by_code(
    product_code: str,
    data: ProductCodeUpdate,
    db: Session = Depends(get_db)
):
    obj = db.query(ProductCode).filter(
        ProductCode.product_code == product_code
    ).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    if data.product_code and data.product_code != product_code:
        exists = db.query(ProductCode).filter(
            ProductCode.product_code == data.product_code
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product code already exists")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(obj, key, value)

    db.commit()
    db.refresh(obj)

    logger.info(f"Updated product_code={product_code}")
    return obj


@router.put("/{code_id}", response_model=ProductCodeResponse, responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]}, summary="Update product code by ID")
def update_product_code(
    code_id: int,
    data: ProductCodeUpdate,
    db: Session = Depends(get_db)
):
    obj = db.query(ProductCode).filter(ProductCode.id == code_id).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    if data.product_code:
        exists = db.query(ProductCode).filter(
            ProductCode.product_code == data.product_code,
            ProductCode.id != code_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product code already exists")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(obj, key, value)

    db.commit()
    db.refresh(obj)

    logger.info(f"Updated product_code id={code_id}")
    return obj


# ─────────────────────────────────────────────
# DELETE
# ─────────────────────────────────────────────

@router.delete("/by-code/{product_code}", responses={404: _ERROR_RESPONSES[404]}, summary="Delete product code by name")
def delete_by_code(product_code: str, db: Session = Depends(get_db)):
    obj = db.query(ProductCode).filter(
        ProductCode.product_code == product_code
    ).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    db.delete(obj)
    db.commit()

    logger.info(f"Deleted product_code={product_code}")
    return {"message": f"Product code '{product_code}' deleted successfully"}


@router.delete("/{code_id}", responses={404: _ERROR_RESPONSES[404]}, summary="Delete product code by ID")
def delete_product_code(code_id: int, db: Session = Depends(get_db)):
    obj = db.query(ProductCode).filter(ProductCode.id == code_id).first()

    if not obj:
        raise HTTPException(status_code=404, detail="Product code not found")

    db.delete(obj)
    db.commit()

    logger.info(f"Deleted product_code id={code_id}")
    return {"message": "Product code deleted successfully"}



