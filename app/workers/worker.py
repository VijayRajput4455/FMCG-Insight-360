import json
import logging
import threading

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.audit_service import process_existing_audit
from app.services.rabbitmq_service import get_rabbitmq_client


logger = logging.getLogger(__name__)
_worker_thread: threading.Thread | None = None
_worker_lock = threading.Lock()


def _publish_retry(payload: dict, error_message: str):
	retry_count = int(payload.get("retry_count", 0)) + 1
	payload["retry_count"] = retry_count
	payload["last_error"] = error_message
	get_rabbitmq_client().publish(
		settings.RABBITMQ_AUDIT_QUEUE,
		payload,
		headers={"x-retry-count": retry_count},
	)


def _publish_failed(payload: dict, error_message: str):
	failed_payload = {
		**payload,
		"final_error": error_message,
		"status": "failed",
	}
	get_rabbitmq_client().publish(
		settings.RABBITMQ_AUDIT_FAILED_QUEUE,
		failed_payload,
		headers={"x-final-failure": True},
	)


def _handle_message(ch, method, properties, body: bytes):
	try:
		payload = json.loads(body.decode("utf-8"))
	except Exception as exc:
		logger.exception("Invalid RabbitMQ payload: %s", exc)
		ch.basic_ack(delivery_tag=method.delivery_tag)
		return

	audit_id = payload.get("audit_id")
	product_code_id = payload.get("product_code_id")
	image_path = payload.get("image_path")

	if not audit_id or not product_code_id or not image_path:
		logger.error("Missing required job fields: %s", payload)
		ch.basic_ack(delivery_tag=method.delivery_tag)
		return

	retry_count = int(payload.get("retry_count", 0))
	db = SessionLocal()
	try:
		logger.info(
			"Processing audit job audit_id=%s product_code_id=%s image_path=%s retry=%s",
			audit_id,
			product_code_id,
			image_path,
			retry_count,
		)
		process_existing_audit(db, int(audit_id), int(product_code_id), str(image_path))
		ch.basic_ack(delivery_tag=method.delivery_tag)
		logger.info("Completed audit job audit_id=%s", audit_id)
	except Exception as exc:
		logger.exception("Audit worker failed for audit_id=%s: %s", audit_id, exc)
		max_retries = settings.RABBITMQ_MAX_RETRIES
		if retry_count < max_retries:
			_publish_retry(payload, str(exc))
			logger.warning(
				"Requeued audit_id=%s retry=%s/%s",
				audit_id,
				retry_count + 1,
				max_retries,
			)
		else:
			_publish_failed(payload, str(exc))
			logger.error(
				"Sent audit_id=%s to failed queue after %s retries",
				audit_id,
				retry_count,
			)
		ch.basic_ack(delivery_tag=method.delivery_tag)
	finally:
		db.close()


def run_worker():
	queue_name = settings.RABBITMQ_AUDIT_QUEUE
	logger.info("Starting audit worker for queue=%s", queue_name)
	get_rabbitmq_client().consume(queue_name, _handle_message, prefetch_count=1)


def start_worker_in_background() -> bool:
	"""Start the worker in a daemon thread once per process.

	Returns True if a new thread was started, False if already running.
	"""
	global _worker_thread
	with _worker_lock:
		if _worker_thread is not None and _worker_thread.is_alive():
			return False

		_worker_thread = threading.Thread(
			target=run_worker,
			name="audit-worker-thread",
			daemon=True,
		)
		_worker_thread.start()
		return True


if __name__ == "__main__":
	run_worker()
