import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    AUTO_START_WORKER: bool = os.getenv("AUTO_START_WORKER", "false").strip().lower() in {"1", "true", "yes", "on"}
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

settings = Settings()