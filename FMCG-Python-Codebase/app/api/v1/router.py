from fastapi import APIRouter

from app.api.v1.endpoints import audit, product_codes, products, models


api_router = APIRouter()

api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(product_codes.router, prefix="/product-codes", tags=["Product Codes"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
