import logging
import os
import threading
from logging.handlers import RotatingFileHandler

from app.core.context import get_request_id


_LOG_FORMAT = '[%(asctime)s] | level=%(levelname)s | request_id=%(request_id)s | module=%(name)s | function=%(funcName)s | line=%(lineno)d | message="%(message)s"'
_configured = False
_lock = threading.Lock()


class _RequestIdFilter(logging.Filter):
    """Inject the current request-id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


def setup_logging(
    level: str = "INFO",
    log_dir: str = "logs",
    log_file: str = "app.log",
) -> None:
    """Configure process-wide logging once (console + rotating file)."""
    global _configured
    with _lock:
        if _configured:
            return

        normalized = (level or "INFO").upper().strip()
        numeric_level = getattr(logging, normalized, logging.INFO)

        request_filter = _RequestIdFilter()

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(_LOG_FORMAT))
        console_handler.addFilter(request_filter)

        # Rotating file handler — 10 MB per file, keep 5 backups
        os.makedirs(log_dir, exist_ok=True)
        file_path = os.path.join(log_dir, log_file)
        file_handler = RotatingFileHandler(
            file_path,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setFormatter(logging.Formatter(_LOG_FORMAT))
        file_handler.addFilter(request_filter)

        root = logging.getLogger()
        root.setLevel(numeric_level)
        root.addHandler(console_handler)
        root.addHandler(file_handler)

        _configured = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
