import os
import time
import asyncio

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.metrics_worker import db_metrics_worker
from app.api.v1.router import api_router
from app.core.metrics import metrics_endpoint, track_requests, ACTIVE_CONNECTIONS
from app.core.config import settings
from app.core.database import engine, Base, get_db, get_database_status
from app.core.context import set_request_id
from app.core.logger import get_logger, setup_logging
from app.models import *  # register all models
from app.schemas.error import ErrorResponse
from app.workers.worker import start_worker_in_background, get_worker_runtime_status

setup_logging(settings.LOG_LEVEL, log_dir=settings.LOG_DIR, log_file=settings.LOG_FILE)

app = FastAPI(title="FMCG Insight 360")
logger = get_logger(__name__)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID")
    request_id = set_request_id(rid)  # generates UUID if header absent
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Track request metrics"""
    start_time = time.time()
    ACTIVE_CONNECTIONS.inc()

    response = await call_next(request)

    process_time = time.time() - start_time
    track_requests(request, response, process_time)
    ACTIVE_CONNECTIONS.dec()

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error("HTTPException %s %s %s", exc.status_code, request.url, exc.detail)
    elif exc.status_code >= 400:
        logger.warning("HTTPException %s %s %s", exc.status_code, request.url, exc.detail)
    else:
        logger.info("HTTPException %s %s %s", exc.status_code, request.url, exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            status="error",
            code=exc.status_code,
            message=exc.detail,
        ).dict(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning("Validation error on %s %s: %s", request.method, request.url, errors)
    message = errors[0]["msg"] if errors else "Validation error"
    details = str(errors) if len(errors) > 1 else None
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            status="error",
            code=422,
            message=message,
            details=details,
        ).dict(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            status="error",
            code=500,
            message="An internal server error occurred.",
        ).dict(),
    )


app.include_router(api_router, prefix="/api/v1")

# Metrics endpoint for Prometheus
@app.get("/metrics")
async def get_metrics(request: Request):
	"""Prometheus metrics endpoint"""
	return await metrics_endpoint(request)

# Serve annotated output images at /images/...
# e.g. outputs/audit/file.jpg → http://host/images/audit/file.jpg
_OUTPUT_DIR = os.getenv("AUDIT_OUTPUT_DIR", "outputs/audit")
os.makedirs(_OUTPUT_DIR, exist_ok=True)
app.mount("/images", StaticFiles(directory="outputs"), name="images")


# Create tables (DEV ONLY - remove later for Alembic)
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
async def startup_db_check():

    ok, message = get_database_status()

    if ok:
        logger.info(message)
    else:
        logger.error(message)

    # Start DB metrics background worker
    asyncio.create_task(db_metrics_worker())

    logger.info("DB metrics worker started")

    if settings.AUTO_START_WORKER:

        started = start_worker_in_background()

        if started:
            logger.info("Embedded audit worker started (AUTO_START_WORKER=true)")
        else:
            logger.info("Embedded audit worker already running")


@app.get("/")
def health_check():
    return {"status": "OK"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        # simple query test
        db.execute(text("SELECT 1"))
        return {"status": "DB connected successfully"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/debug-db")
def debug_db_status():
    ok, message = get_database_status()
    return {"ok": ok, "message": message}


@app.get("/worker-status")
def worker_status():
    return get_worker_runtime_status()