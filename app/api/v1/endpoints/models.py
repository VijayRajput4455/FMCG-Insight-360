from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.model import Model
from app.models.product_code import ProductCode
from app.schemas.model import ModelCreate, ModelUpdate, ModelResponse
from app.schemas.error import ErrorResponse

router = APIRouter()
logger = logging.getLogger(__name__)

_ERROR_RESPONSES = {
	400: {"model": ErrorResponse, "description": "Bad request"},
	404: {"model": ErrorResponse, "description": "Not found"},
	422: {"model": ErrorResponse, "description": "Validation error"},
}


@router.post(
	"/",
	response_model=ModelResponse,
	responses={400: _ERROR_RESPONSES[400], 422: _ERROR_RESPONSES[422]},
	summary="Create model",
)
def create_model(data: ModelCreate, db: Session = Depends(get_db)):
	product_code = db.query(ProductCode).filter(ProductCode.id == data.product_code_id).first()
	if not product_code:
		raise HTTPException(status_code=400, detail="Invalid product_code_id")

	existing = db.query(Model).filter(
		Model.product_code_id == data.product_code_id,
		Model.model_name == data.model_name,
	).first()
	if existing:
		raise HTTPException(status_code=400, detail="Model already exists for this product code")

	obj = Model(**data.dict())
	db.add(obj)
	db.commit()
	db.refresh(obj)

	logger.info(f"Created model={obj.model_name} for product_code_id={obj.product_code_id}")
	return obj


@router.get(
	"/",
	response_model=list[ModelResponse],
	responses={422: _ERROR_RESPONSES[422]},
	summary="List models",
)
def get_all_models(
	skip: int = Query(0, ge=0),
	limit: int = Query(50, ge=1, le=200),
	db: Session = Depends(get_db),
):
	return db.query(Model).offset(skip).limit(limit).all()


@router.get(
	"/by-product-code/{product_code_id}",
	response_model=list[ModelResponse],
	responses={404: _ERROR_RESPONSES[404]},
	summary="List models by product code ID",
)
def get_models_by_product_code(product_code_id: int, db: Session = Depends(get_db)):
	product_code = db.query(ProductCode).filter(ProductCode.id == product_code_id).first()
	if not product_code:
		raise HTTPException(status_code=404, detail="Product code not found")

	return db.query(Model).filter(Model.product_code_id == product_code_id).all()


@router.get(
	"/by-name/{model_name}",
	response_model=ModelResponse,
	responses={404: _ERROR_RESPONSES[404]},
	summary="Get model by name",
)
def get_model_by_name(model_name: str, db: Session = Depends(get_db)):
	obj = db.query(Model).filter(Model.model_name == model_name).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")
	return obj


@router.get(
	"/{model_id}",
	response_model=ModelResponse,
	responses={404: _ERROR_RESPONSES[404]},
	summary="Get model by ID",
)
def get_model(model_id: int, db: Session = Depends(get_db)):
	obj = db.query(Model).filter(Model.id == model_id).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")
	return obj


@router.put(
	"/by-name/{model_name}",
	response_model=ModelResponse,
	responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]},
	summary="Update model by name",
)
def update_model_by_name(
	model_name: str,
	data: ModelUpdate,
	db: Session = Depends(get_db),
):
	obj = db.query(Model).filter(Model.model_name == model_name).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")

	updates = data.dict(exclude_unset=True)
	if "product_code_id" in updates:
		product_code = db.query(ProductCode).filter(ProductCode.id == updates["product_code_id"]).first()
		if not product_code:
			raise HTTPException(status_code=400, detail="Invalid product_code_id")

	for key, value in updates.items():
		setattr(obj, key, value)

	db.commit()
	db.refresh(obj)

	logger.info(f"Updated model by name={model_name}")
	return obj


@router.put(
	"/{model_id}",
	response_model=ModelResponse,
	responses={400: _ERROR_RESPONSES[400], 404: _ERROR_RESPONSES[404], 422: _ERROR_RESPONSES[422]},
	summary="Update model by ID",
)
def update_model(
	model_id: int,
	data: ModelUpdate,
	db: Session = Depends(get_db),
):
	obj = db.query(Model).filter(Model.id == model_id).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")

	updates = data.dict(exclude_unset=True)
	if "product_code_id" in updates:
		product_code = db.query(ProductCode).filter(ProductCode.id == updates["product_code_id"]).first()
		if not product_code:
			raise HTTPException(status_code=400, detail="Invalid product_code_id")

	for key, value in updates.items():
		setattr(obj, key, value)

	db.commit()
	db.refresh(obj)

	logger.info(f"Updated model id={model_id}")
	return obj


@router.delete(
	"/by-name/{model_name}",
	responses={404: _ERROR_RESPONSES[404]},
	summary="Delete model by name",
)
def delete_model_by_name(model_name: str, db: Session = Depends(get_db)):
	obj = db.query(Model).filter(Model.model_name == model_name).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")

	db.delete(obj)
	db.commit()

	logger.info(f"Deleted model name={model_name}")
	return {"message": "Model deleted successfully"}


@router.delete(
	"/{model_id}",
	responses={404: _ERROR_RESPONSES[404]},
	summary="Delete model by ID",
)
def delete_model(model_id: int, db: Session = Depends(get_db)):
	obj = db.query(Model).filter(Model.id == model_id).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")

	db.delete(obj)
	db.commit()

	logger.info(f"Deleted model id={model_id}")
	return {"message": "Model deleted successfully"}
