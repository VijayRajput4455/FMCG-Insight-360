import asyncio
import logging
import os
import uuid
from urllib.parse import urlparse

import cv2
import numpy as np
import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.audit_result import AuditResult
from app.models.product_code import ProductCode
from app.repositories.audit_repo import create_audit, update_audit_status
from app.services.rabbitmq_service import get_rabbitmq_client
from app.services.redis_cache import get_redis_cache
from app.core.metrics import increment_audit_request, increment_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)
redis_cache = get_redis_cache()


def build_response(
	product_image_url: str,
	image_name: str = "",
	detected_products: list | None = None,
	total_product_count: int = 0,
	total_self_count: int = 0,
	total_competition_count: int = 0,
	brand_counts: list | None = None,
	detection_reason: str = "",
	detection_coordinates: list | None = None,
):
	return {
		"product_image_url": product_image_url,
		"image_name": image_name,
		"detected_products": detected_products or [],
		"total_product_count": total_product_count,
		"total_self_count": total_self_count,
		"total_competition_count": total_competition_count,
		"brand_counts": brand_counts or [],
		"detection_coordinates": detection_coordinates or [],
		"detection_reason": detection_reason,
	}


def _download_image(image_url: str):
	parsed = urlparse(image_url)

	# Support local filesystem path and file:// URI for easier local Postman testing.
	if parsed.scheme in {"", "file"}:
		local_path = parsed.path if parsed.scheme == "file" else image_url
		if not os.path.exists(local_path):
			raise FileNotFoundError(f"Image not found: {local_path}")
		image = cv2.imread(local_path)
		return image

	response = requests.get(image_url, timeout=15)
	response.raise_for_status()
	image_array = np.frombuffer(response.content, np.uint8)
	image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
	return image


def _save_input_image(image: np.ndarray) -> str:
	input_dir = os.getenv("AUDIT_INPUT_DIR", "uploads/audit")
	os.makedirs(input_dir, exist_ok=True)

	filename = f"audit_input_{uuid.uuid4().hex}.jpg"
	image_path = os.path.join(input_dir, filename)
	cv2.imwrite(image_path, image)
	return image_path


def _annotated_image_url(request: Request, local_path: str | None) -> str:
	"""Convert a local outputs/audit/... path to a /api/v1/audit/image/{filename} URL."""
	if not local_path:
		return ""
	filename = os.path.basename(local_path)
	base = str(request.base_url).rstrip("/")
	return f"{base}/api/v1/audit/image/{filename}"


def _product_code_cache_key(product_code: str) -> str:
	return f"product_code:id:{product_code.strip().lower()}"


def _audit_result_cache_key(audit_id: int) -> str:
	return f"audit:result:{audit_id}"


def _rate_limit_key(request: Request, endpoint: str) -> str:
	"""Generate a rate limit key based on client IP and endpoint."""
	client_ip = request.client.host if request.client else "unknown"
	return f"rate_limit:{client_ip}:{endpoint}"


async def check_rate_limit(request: Request, endpoint: str = "audit"):
	"""
	Rate limiting dependency for audit endpoints.
	Limits: Configurable requests per minute per IP per endpoint (default: 10 requests per 60 seconds).
	"""
	key = _rate_limit_key(request, endpoint)
	
	# Check if within limit
	if not redis_cache.check_rate_limit(key, limit=settings.RATE_LIMIT_REQUESTS_PER_MINUTE, window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS):
		# Track rate limit violation
		increment_rate_limit(endpoint, request.client.host if request.client else "unknown")
		logger.warning("Rate limit exceeded | ip=%s endpoint=%s", request.client.host if request.client else "unknown", endpoint)
		raise HTTPException(
			status_code=429, 
			detail="Too many requests. Please try again later."
		)
	
	# Increment the counter
	redis_cache.increment_rate_limit(key, window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS)


def get_rate_limit_dependency(endpoint: str):
	"""Factory function to create rate limit dependency for specific endpoint."""
	async def dependency(request: Request):
		await check_rate_limit(request, endpoint)
	return dependency


def _get_product_code_id(db: Session, product_code: str) -> int | None:
	cache_key = _product_code_cache_key(product_code)
	cached = redis_cache.get_json(cache_key)
	if cached and "product_code_id" in cached:
		return int(cached["product_code_id"])

	row = (
		db.query(ProductCode.id)
		.filter(ProductCode.product_code == product_code)
		.first()
	)
	if not row:
		return None

	product_code_id = int(row[0])
	redis_cache.set_json(cache_key, {"product_code_id": product_code_id})
	return product_code_id


def _build_audit_status_response(audit: AuditResult, request: Request) -> dict:
	response = {
		"audit_id": audit.id,
		"status": audit.status,
		"error_message": audit.error_message,
	}

	if audit.result_json:
		result_json = dict(audit.result_json)
		annotated_path = result_json.get("annotated_image_path")
		if annotated_path:
			result_json["product_image_url"] = _annotated_image_url(request, annotated_path)
			result_json["image_name"] = os.path.basename(annotated_path)
		response["result_json"] = result_json

	return response


def _queue_audit_pipeline(db: Session, product_code: str, image: np.ndarray, source_ref: str):
	product_code_id = _get_product_code_id(db, product_code)

	if not product_code_id:
		logger.warning("Invalid product code -> %s", product_code)
		return build_response(
			product_image_url=source_ref,
			detection_reason="ERROR-Please Enter Correct Product Code / Brand ID",
		)

	if not isinstance(image, np.ndarray):
		logger.error("Decoded image is invalid -> %s", source_ref)
		return {
			"status": "error",
			"message": "Image Url not found",
		}

	input_image_path = _save_input_image(image)
	audit = create_audit(db, product_code_id, input_image_path)

	try:
		payload = {
			"audit_id": audit.id,
			"product_code_id": product_code_id,
			"image_path": input_image_path,
		}
		get_rabbitmq_client().publish(settings.RABBITMQ_AUDIT_QUEUE, payload)
		increment_audit_request(product_code, "success")
	except Exception as e:
		update_audit_status(db, audit.id, "failed", error_message=str(e))
		increment_audit_request(product_code, "queue_error")
		logger.exception("Audit queue publish failed for product_code=%s", product_code)
		return {
			"audit_id": audit.id,
			"status": "failed",
			"message": str(e),
		}

	return {
		"audit_id": audit.id,
		"status": "pending",
		"message": "Audit job queued",
	}


@router.get("/", summary="List audits")
def list_audits(
	product_code: str | None = Query(None, description="Filter by product code"),
	status: str | None = Query(None, description="pending / processing / completed / failed"),
	skip: int = Query(0, ge=0),
	limit: int = Query(50, ge=1, le=200),
	db: Session = Depends(get_db),
):
	q = db.query(AuditResult).join(ProductCode, ProductCode.id == AuditResult.product_code_id)

	if product_code:
		q = q.filter(ProductCode.product_code.ilike(f"%{product_code}%"))

	if status:
		q = q.filter(AuditResult.status == status)

	rows = q.order_by(AuditResult.created_at.desc()).offset(skip).limit(limit).all()

	response = []
	for row in rows:
		response.append(
			{
				"id": row.id,
				"audit_id": row.id,
				"product_code": row.product_code.product_code if row.product_code else None,
				"status": row.status,
				"created_at": row.created_at,
				"error_message": row.error_message,
			}
		)

	return response


@router.get("/by-code")
def detect_products_by_code_api(
	request: Request,
	product_code: str = Query(
		...,
		min_length=2,
		description="Unique product code or brand identifier (e.g. PEPSI, AMUL)",
	),
	image_url: str = Query(
		...,
		min_length=10,
		description="Publicly accessible image URL for detection",
	),
	db: Session = Depends(get_db),
	rate_limit: None = Depends(get_rate_limit_dependency("by-code")),
):
	logger.info("Detection request received | product_code=%s", product_code)

	try:
		try:
			image = _download_image(image_url)
		except Exception:
			logger.exception("Image loading failed -> %s", image_url)
			return build_response(
				product_image_url=image_url,
				detection_reason="ERROR-Please Enter Correct Product Code / Image Url",
			)

		return _queue_audit_pipeline(db, product_code, image, image_url)

	except Exception as e:
		increment_audit_request(product_code, "error")
		logger.exception("Unhandled detection failure -> %s", str(e))
		return build_response(
			product_image_url=image_url,
			detection_reason="Internal server error during detection",
		)


@router.post("/by-code/upload")
async def detect_products_by_code_upload_api(
	request: Request,
	product_code: str = Form(..., min_length=2),
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
	rate_limit: None = Depends(get_rate_limit_dependency("by-code-upload")),
):
	print(request.headers,"yyyyyyyyyyyyyyyyyyyyyyyyyyyy")
	logger.info("Upload detection request received | product_code=%s", product_code)

	file_ref = file.filename or "uploaded-file"

	try:
		contents = await file.read()
		if not contents:
			return build_response(
				product_image_url=file_ref,
				detection_reason="Empty file",
			)

		np_arr = np.frombuffer(contents, np.uint8)
		image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

		if image is None:
			return {
				"status": "error",
				"message": "Invalid image format",
			}

		return _queue_audit_pipeline(db, product_code, image, file_ref)

	except Exception as e:
		increment_audit_request(product_code, "error")
		logger.exception("Unhandled upload detection failure -> %s", str(e))
		return {
			"status": "error",
			"message": "Internal server error during detection",
		}


@router.get("/{audit_id}", summary="Get audit status and result")
def get_audit_status(audit_id: int, request: Request, db: Session = Depends(get_db)):
	cache_key = _audit_result_cache_key(audit_id)
	cached = redis_cache.get_json(cache_key)
	if cached:
		return cached

	audit = db.query(AuditResult).filter(AuditResult.id == audit_id).first()
	if not audit:
		raise HTTPException(status_code=404, detail="Audit not found")

	response = _build_audit_status_response(audit, request)

	if audit.status in ("completed", "failed"):
		redis_cache.set_json(cache_key, response, ttl_seconds=settings.REDIS_AUDIT_RESULT_TTL_SECONDS)

	return response


@router.websocket("/ws/{audit_id}")
async def audit_websocket(
	websocket: WebSocket,
	audit_id: int,
	db: Session = Depends(get_db),
):
	"""
	WebSocket endpoint — connect after submitting an audit to receive live status
	updates and the final result pushed automatically.

	Flow:
	  1. Frontend submits POST /by-code/upload  →  receives { audit_id, status: "pending" }
	  2. Frontend opens  WS  /api/v1/audit/ws/{audit_id}
	  3. Server polls DB every 1.5 s and sends status frames
	  4. When worker finishes, server pushes the full result JSON and closes the socket
	"""
	await websocket.accept()
	logger.info("WebSocket connected | audit_id=%s", audit_id)

	_POLL_INTERVAL = 1.5   # seconds between DB checks
	_TIMEOUT       = 300   # 5-minute safety timeout

	elapsed = 0.0
	try:
		while elapsed < _TIMEOUT:
			db.expire_all()  # force fresh read from DB each iteration
			audit = db.query(AuditResult).filter(AuditResult.id == audit_id).first()

			if not audit:
				await websocket.send_json({
					"audit_id": audit_id,
					"status": "error",
					"error_message": "Audit not found",
				})
				break

			if audit.status in ("completed", "failed"):
				response = {
					"audit_id": audit.id,
					"status": audit.status,
					"error_message": audit.error_message,
				}

				if audit.result_json:
					result_json = dict(audit.result_json)
					annotated_path = result_json.get("annotated_image_path")
					if annotated_path:
						filename = os.path.basename(annotated_path)
						result_json["image_name"] = filename
						result_json["product_image_url"] = f"/api/v1/audit/image/{filename}"
					response["result_json"] = result_json

				await websocket.send_json(response)
				logger.info("WebSocket result sent | audit_id=%s status=%s", audit_id, audit.status)
				break

			# Still processing — send a progress heartbeat so frontend knows we're alive
			await websocket.send_json({"audit_id": audit_id, "status": audit.status})

			await asyncio.sleep(_POLL_INTERVAL)
			elapsed += _POLL_INTERVAL
		else:
			await websocket.send_json({
				"audit_id": audit_id,
				"status": "timeout",
				"error_message": "Processing timed out after 5 minutes",
			})

	except WebSocketDisconnect:
		logger.info("WebSocket disconnected by client | audit_id=%s", audit_id)
	except Exception:
		logger.exception("WebSocket error | audit_id=%s", audit_id)
	finally:
		try:
			await websocket.close()
		except Exception:
			pass


@router.get("/image/{filename}", summary="View annotated output image")
def get_audit_image(filename: str):
	"""
	Serve a saved annotated image by filename.
	Example: GET /api/v1/audit/image/audit_1_abc123.jpg
	"""
	output_dir = os.getenv("AUDIT_OUTPUT_DIR", "outputs/audit")
	file_path = os.path.join(output_dir, filename)

	if not os.path.isfile(file_path):
		raise HTTPException(status_code=404, detail="Image not found")

	return FileResponse(file_path, media_type="image/jpeg")