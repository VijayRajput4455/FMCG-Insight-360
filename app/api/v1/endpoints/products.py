from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.product import Product
from app.models.product_code import ProductCode
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, BulkProductResponse
from app.schemas.error import ErrorResponse

router = APIRouter()
logger = logging.getLogger(__name__)

_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Bad request"},
    404: {"model": ErrorResponse, "description": "Not found"},
    422: {"model": ErrorResponse, "description": "Validation error"},
}


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

@router.post("/", response_model=ProductResponse, responses={400: _ERROR_RESPONSES[400], 422: _ERROR_RESPONSES[422]}, summary="Create a product")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    product_code = db.query(ProductCode).filter(ProductCode.id == product.product_code_id).first()
    if not product_code:
        raise HTTPException(status_code=400, detail="Invalid product_code_id")

    existing = db.query(Product).filter(
        Product.product_name == product.product_name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")

    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    logger.info(f"Product created: {db_product.product_name}")
    return db_product


@router.post("/bulk", response_model=BulkProductResponse, responses={422: _ERROR_RESPONSES[422]}, summary="Create multiple products at once")
def create_products_bulk(products: list[ProductCreate], db: Session = Depends(get_db)):
    created = []
    skipped = []
    
    try:
        # First pass: validate all items (check for existing duplicates)
        for item in products:
            product_code = db.query(ProductCode).filter(ProductCode.id == item.product_code_id).first()
            if not product_code:
                raise HTTPException(status_code=400, detail=f"Invalid product_code_id for {item.product_name}")
            existing = db.query(Product).filter(Product.product_name == item.product_name).first()
            if existing:
                skipped.append(item.product_name)
        
        # Second pass: add only non-duplicates to session (not yet committed)
        for item in products:
            if item.product_name not in skipped:
                obj = Product(**item.dict())
                db.add(obj)
                created.append(obj)
        
        # Commit atomically - all products commit together or none at all
        db.commit()
        
        # Refresh objects after successful commit
        for obj in created:
            db.refresh(obj)
        
        logger.info(f"Bulk create atomic: {len(created)} created, {len(skipped)} skipped")
        return {"created": created, "skipped": skipped}
    
    except Exception as e:
        # Rollback entire transaction if anything fails
        db.rollback()
        logger.exception(f"Bulk insert failed, rolled back all changes: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk insert failed and rolled back: {str(e)}")


# ─────────────────────────────────────────────
# READ
# ─────────────────────────────────────────────

@router.get("/", response_model=list[ProductResponse], responses={422: _ERROR_RESPONSES[422]}, summary="List all products")
def get_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    return db.query(Product).offset(skip).limit(limit).all()


@router.get("/search/", response_model=list[ProductResponse], responses={422: _ERROR_RESPONSES[422]}, summary="Search products by name, brand, category or type")
def search_products(
    product_code_id: int = Query(None, description="Filter by product code ID"),
    name: str = Query(None, description="Partial product name"),
    brand: str = Query(None, description="Partial brand name"),
    category: str = Query(None, description="Partial category"),
    type: str = Query(None, description="own / competitor"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(Product)
    if product_code_id is not None:
        q = q.filter(Product.product_code_id == product_code_id)
    if name:
        q = q.filter(Product.product_name.ilike(f"%{name}%"))
    if brand:
        q = q.filter(Product.brand.ilike(f"%{brand}%"))
    if category:
        q = q.filter(Product.category.ilike(f"%{category}%"))
    if type:
        q = q.filter(Product.type == type)
    return q.offset(skip).limit(limit).all()


@router.get("/by-name/{product_name}", response_model=ProductResponse, responses={404: _ERROR_RESPONSES[404]}, summary="Get product by name")
def get_product_by_name(product_name: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_name == product_name).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/{product_id}", response_model=ProductResponse, responses={404: _ERROR_RESPONSES[404]}, summary="Get product by ID")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


# ─────────────────────────────────────────────
# UPDATE
# ─────────────────────────────────────────────

@router.put("/by-name/{product_name}", response_model=ProductResponse, responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]}, summary="Update product by name")
def update_product_by_name(
    product_name: str,
    product_update: ProductUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.product_name == product_name).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_update.product_name and product_update.product_name != product_name:
        exists = db.query(Product).filter(Product.product_name == product_update.product_name).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product name already exists")

    if product_update.product_code_id is not None:
        product_code = db.query(ProductCode).filter(ProductCode.id == product_update.product_code_id).first()
        if not product_code:
            raise HTTPException(status_code=400, detail="Invalid product_code_id")

    for key, value in product_update.dict(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    logger.info(f"Product updated by name: {product_name}")
    return product


@router.put("/{product_id}", response_model=ProductResponse, responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]}, summary="Update product by ID")
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_update.product_name:
        exists = db.query(Product).filter(
            Product.product_name == product_update.product_name,
            Product.id != product_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product name already exists")

    if product_update.product_code_id is not None:
        product_code = db.query(ProductCode).filter(ProductCode.id == product_update.product_code_id).first()
        if not product_code:
            raise HTTPException(status_code=400, detail="Invalid product_code_id")

    for key, value in product_update.dict(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    logger.info(f"Product updated: {product_id}")
    return product


# ─────────────────────────────────────────────
# DELETE
# ─────────────────────────────────────────────

@router.delete("/by-name/{product_name}", responses={404: _ERROR_RESPONSES[404]}, summary="Delete product by name")
def delete_product_by_name(product_name: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_name == product_name).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()

    logger.info(f"Product deleted by name: {product_name}")
    return {"message": f"Product '{product_name}' deleted successfully"}


@router.delete("/{product_id}", responses={404: _ERROR_RESPONSES[404]}, summary="Delete product by ID")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()

    logger.info(f"Product deleted: {product_id}")
    return {"message": "Product deleted successfully"}

