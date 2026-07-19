import os
from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: str = os.getenv("LOG_DIR", "logs")
    LOG_FILE: str = os.getenv("LOG_FILE", "FMCG-Insight-360.log")
    AUTO_START_WORKER: bool = _env_bool("AUTO_START_WORKER")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str | None = os.getenv("REDIS_PASSWORD")
    REDIS_DEFAULT_TTL_SECONDS: int = int(os.getenv("REDIS_DEFAULT_TTL_SECONDS", "600"))
    REDIS_AUDIT_RESULT_TTL_SECONDS: int = int(os.getenv("REDIS_AUDIT_RESULT_TTL_SECONDS", "1800"))
    RABBITMQ_HOST: str = os.getenv("RABBITMQ_HOST", "localhost")
    RABBITMQ_PORT: int = int(os.getenv("RABBITMQ_PORT", "5672"))
    RABBITMQ_USER: str = os.getenv("RABBITMQ_USER", "guest")
    RABBITMQ_PASSWORD: str = os.getenv("RABBITMQ_PASSWORD", "guest")
    RABBITMQ_VHOST: str = os.getenv("RABBITMQ_VHOST", "/")
    RABBITMQ_HEARTBEAT: int = int(os.getenv("RABBITMQ_HEARTBEAT", "600"))
    RABBITMQ_BLOCKED_TIMEOUT: int = int(os.getenv("RABBITMQ_BLOCKED_TIMEOUT", "300"))
    RABBITMQ_EXCHANGE: str = os.getenv("RABBITMQ_EXCHANGE", "fmcg.direct")
    RABBITMQ_AUDIT_QUEUE: str = os.getenv("RABBITMQ_AUDIT_QUEUE", "audit.jobs")
    RABBITMQ_AUDIT_FAILED_QUEUE: str = os.getenv("RABBITMQ_AUDIT_FAILED_QUEUE", "audit.jobs.failed")
    RABBITMQ_MAX_RETRIES: int = int(os.getenv("RABBITMQ_MAX_RETRIES", "3"))
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "10"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    ML_MODEL_DIR: str = os.getenv("ML_MODEL_DIR", os.getenv("ML_FOLDER", "ml_models"))
    MINIO_ENABLED: bool = _env_bool("MINIO_ENABLED")
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_PUBLIC_ENDPOINT: str = os.getenv("MINIO_PUBLIC_ENDPOINT", MINIO_ENDPOINT)
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_SECURE: bool = _env_bool("MINIO_SECURE")
    MINIO_AUTO_CREATE_BUCKETS: bool = _env_bool("MINIO_AUTO_CREATE_BUCKETS", "true")
    MINIO_INPUT_BUCKET: str = os.getenv("MINIO_INPUT_BUCKET", "audit-input")
    MINIO_OUTPUT_BUCKET: str = os.getenv("MINIO_OUTPUT_BUCKET", "audit-output")
    MINIO_PRESIGNED_URL_EXPIRY_SECONDS: int = int(os.getenv("MINIO_PRESIGNED_URL_EXPIRY_SECONDS", "3600"))

settings = Settings()