from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os

from app.core.database import get_db
from app.models.model import Model
from app.models.product_code import ProductCode
from app.schemas.model import ModelCreate, ModelUpdate, ModelResponse
from app.schemas.error import ErrorResponse
from app.services.model_service import _model_service

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

	# Validate resolved model path exists
	resolved_path = _model_service.resolve_model_path(data.model_path)
	if not os.path.exists(resolved_path):
		raise HTTPException(
			status_code=400,
			detail=f"Model weights file not found: '{data.model_path}' (Resolved as '{resolved_path}')"
		)

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
	active_only: bool = Query(False, description="If true, return only active models"),
	db: Session = Depends(get_db),
):
	q = db.query(Model)
	if active_only:
		q = q.filter(Model.is_active == True)
	return q.offset(skip).limit(limit).all()


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


@router.patch(
	"/{model_id}/toggle-active",
	response_model=ModelResponse,
	responses={404: _ERROR_RESPONSES[404]},
	summary="Toggle model active/inactive status",
)
def toggle_model_active(model_id: int, db: Session = Depends(get_db)):
	obj = db.query(Model).filter(Model.id == model_id).first()
	if not obj:
		raise HTTPException(status_code=404, detail="Model not found")

	obj.is_active = not obj.is_active
	db.commit()
	db.refresh(obj)

	status_str = "activated" if obj.is_active else "deactivated"
	logger.info(f"Model id={obj.id} name={obj.model_name} {status_str}")
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

	if "model_path" in updates:
		resolved_path = _model_service.resolve_model_path(updates["model_path"])
		if not os.path.exists(resolved_path):
			raise HTTPException(
				status_code=400,
				detail=f"Model weights file not found: '{updates['model_path']}' (Resolved as '{resolved_path}')"
			)

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

	if "model_path" in updates:
		resolved_path = _model_service.resolve_model_path(updates["model_path"])
		if not os.path.exists(resolved_path):
			raise HTTPException(
				status_code=400,
				detail=f"Model weights file not found: '{updates['model_path']}' (Resolved as '{resolved_path}')"
			)

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


@router.post(
	"/upload",
	response_model=ModelResponse,
	responses={400: _ERROR_RESPONSES[400], 422: _ERROR_RESPONSES[422]},
	summary="Upload model weights file and register it",
)
async def upload_model(
	file: UploadFile = File(...),
	product_code_id: int = Form(...),
	model_name: str = Form(...),
	folder_name: str = Form(...),
	image_size: int = Form(640),
	conf_threshold: float = Form(0.45),
	iou_threshold: float = Form(0.45),
	db: Session = Depends(get_db),
):
	# Validate thresholds and sizing
	if not (320 <= image_size <= 2048):
		raise HTTPException(status_code=400, detail="image_size must be between 320 and 2048")
	if not (0.0 <= conf_threshold <= 1.0):
		raise HTTPException(status_code=400, detail="conf_threshold must be between 0.0 and 1.0")
	if not (0.0 <= iou_threshold <= 1.0):
		raise HTTPException(status_code=400, detail="iou_threshold must be between 0.0 and 1.0")

	# Validate folder_name
	clean_folder = folder_name.replace("..", "").strip("/\\").replace("\\", "/")
	if not clean_folder:
		raise HTTPException(status_code=400, detail="Folder name is required for uploading weights file")

	# Validate product_code_id
	product_code = db.query(ProductCode).filter(ProductCode.id == product_code_id).first()
	if not product_code:
		raise HTTPException(status_code=400, detail="Invalid product_code_id")

	# Check duplicate model name under product code
	existing = db.query(Model).filter(
		Model.product_code_id == product_code_id,
		Model.model_name == model_name,
	).first()
	if existing:
		raise HTTPException(status_code=400, detail="Model already exists for this product code")

	# Validate model weights suffix
	filename = os.path.basename(file.filename)
	if not filename.endswith(".pt"):
		raise HTTPException(status_code=400, detail="Only PyTorch model weight files (.pt) are supported")

	# Compute model path based on mandatory folder_name
	model_path = f"{clean_folder}/{filename}"

	# Resolve path and ensure parent directories exist
	resolved_path = _model_service.resolve_model_path(model_path)
	os.makedirs(os.path.dirname(resolved_path), exist_ok=True)

	# Write uploaded file in chunks
	try:
		with open(resolved_path, "wb") as buffer:
			while chunk := await file.read(1024 * 1024):  # 1MB chunks
				buffer.write(chunk)
	except Exception as e:
		logger.exception("Failed to write uploaded model weights file")
		raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

	# Save registration metadata to DB
	obj = Model(
		product_code_id=product_code_id,
		model_name=model_name,
		model_path=model_path,
		image_size=image_size,
		conf_threshold=conf_threshold,
		iou_threshold=iou_threshold,
	)
	db.add(obj)
	db.commit()
	db.refresh(obj)

	logger.info(f"Uploaded and registered model={obj.model_name} for product_code_id={obj.product_code_id}")
	return obj
