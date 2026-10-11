import json
import logging
import threading
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisCache:
    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._client: Redis | None = None
        self._lock = threading.Lock()
        self._initialized = True

    def _get_client(self) -> Redis | None:
        if self._client is not None:
            return self._client

        with self._lock:
            if self._client is not None:
                return self._client

            try:
                client = Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    password=settings.REDIS_PASSWORD,
                    decode_responses=True,
                    socket_timeout=1,
                    socket_connect_timeout=1,
                )
                client.ping()
                self._client = client
                logger.info("Redis cache connected | host=%s port=%s db=%s", settings.REDIS_HOST, settings.REDIS_PORT, settings.REDIS_DB)
            except Exception:
                logger.exception("Redis cache unavailable; continuing with DB-only mode")
                self._client = None

        return self._client

    def get_json(self, key: str) -> dict[str, Any] | None:
        client = self._get_client()
        if client is None:
            return None

        try:
            raw = client.get(key)
            if not raw:
                return None
            return json.loads(raw)
        except (RedisError, json.JSONDecodeError):
            logger.exception("Redis get_json failed | key=%s", key)
            return None

    def set_json(self, key: str, value: dict[str, Any], ttl_seconds: int | None = None) -> None:
        client = self._get_client()
        if client is None:
            return

        ttl = ttl_seconds if ttl_seconds is not None else settings.REDIS_DEFAULT_TTL_SECONDS
        try:
            client.setex(key, ttl, json.dumps(value, default=str))
        except (RedisError, TypeError, ValueError):
            logger.exception("Redis set_json failed | key=%s", key)

    def delete(self, key: str) -> None:
        client = self._get_client()
        if client is None:
            return

        try:
            client.delete(key)
        except RedisError:
            logger.exception("Redis delete failed | key=%s", key)

    def check_rate_limit(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Check if the rate limit has been exceeded for the given key.
        Returns True if within limit, False if exceeded.
        """
        client = self._get_client()
        if client is None:
            # If Redis is unavailable, allow the request
            return True

        try:
            current_count = client.get(key)
            if current_count is None:
                return True
            return int(current_count) < limit
        except RedisError:
            logger.exception("Redis rate limit check failed | key=%s", key)
            return True

    def increment_rate_limit(self, key: str, window_seconds: int) -> None:
        """
        Increment the rate limit counter for the given key.
        """
        client = self._get_client()
        if client is None:
            return

        try:
            # Use INCR to atomically increment
            client.incr(key)
            # Set expiration if this is the first request in the window
            client.expire(key, window_seconds)
        except RedisError:
            logger.exception("Redis rate limit increment failed | key=%s", key)


_redis_cache = RedisCache()


def get_redis_cache() -> RedisCache:
    return _redis_cache
