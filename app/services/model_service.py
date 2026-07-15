import logging
import os
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any

from ultralytics import YOLO

from app.repositories.model_repo import get_models_by_product_code

logger = logging.getLogger(__name__)


# ---------------- CACHE ENTRY ----------------
@dataclass
class _CachedModel:
    model: YOLO
    loaded_at: float
    last_used: float


# ---------------- MODEL SERVICE ----------------
class ModelService:
    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        with self._instance_lock:
            if self._initialized:
                return

            # Config (env driven)
            self.max_cache_size = max(1, int(os.getenv("MODEL_CACHE_SIZE", "10")))
            self.max_idle_seconds = max(60, int(os.getenv("MODEL_MAX_IDLE_SECONDS", "900")))

            self.model_cache: OrderedDict[str, _CachedModel] = OrderedDict()
            self.model_lock = threading.Lock()

            self._initialized = True

            logger.info(
                "ModelService initialized | max_cache_size=%s | max_idle_seconds=%s",
                self.max_cache_size,
                self.max_idle_seconds,
            )

    # ---------------- UTIL ----------------
    def resolve_model_path(self, model_path: str) -> str:
        if not model_path:
            return model_path

        from app.core.config import settings
        base_dir = getattr(settings, "ML_MODEL_DIR", "ml_models")

        # If it is absolute, return normalized path
        if os.path.isabs(model_path):
            return os.path.normpath(model_path)

        # If it already exists as-is relative to current working directory, use it
        if os.path.exists(model_path):
            return os.path.normpath(os.path.abspath(model_path))

        # Otherwise, resolve relative to ML_MODEL_DIR
        resolved = os.path.join(base_dir, model_path)
        return os.path.normpath(os.path.abspath(resolved))

    def _make_key(self, model_path: str) -> str:
        return os.path.abspath(model_path)

    def _evict_idle_models_locked(self, now: float):
        to_remove = [
            key for key, entry in self.model_cache.items()
            if now - entry.last_used > self.max_idle_seconds
        ]

        for key in to_remove:
            del self.model_cache[key]

        if to_remove:
            logger.info("Evicted %s idle model(s)", len(to_remove))

    def _evict_until_capacity_locked(self):
        while len(self.model_cache) >= self.max_cache_size:
            evicted_key, _ = self.model_cache.popitem(last=False)
            logger.warning("LRU eviction: %s", evicted_key)

    # ---------------- MAIN LOADER (FIXED) ----------------
    def load_model(self, model_path: str) -> YOLO:
        resolved_path = self.resolve_model_path(model_path)
        if not os.path.exists(resolved_path):
            raise FileNotFoundError(f"Model not found at: {resolved_path} (original path: {model_path})")

        key = self._make_key(resolved_path)
        now = time.monotonic()

        # Fast cache read under lock to keep OrderedDict access thread-safe.
        with self.model_lock:
            entry = self.model_cache.get(key)
            if entry:
                entry.last_used = now
                self.model_cache.move_to_end(key)
                logger.info("Using cached model: %s", resolved_path)
                return entry.model

        # Load outside lock so other requests are not blocked while model initializes.
        try:
            logger.info("Loading YOLO model: %s", resolved_path)
            model = YOLO(resolved_path)
        except Exception:
            logger.exception("Error loading model: %s", resolved_path)
            raise

        with self.model_lock:
            # Double check in case another thread loaded while we were loading.
            entry = self.model_cache.get(key)
            if entry:
                entry.last_used = now
                self.model_cache.move_to_end(key)
                return entry.model

            self._evict_idle_models_locked(now)
            self._evict_until_capacity_locked()

            self.model_cache[key] = _CachedModel(
                model=model,
                loaded_at=now,
                last_used=now,
            )

        return model

    # ---------------- MANAGEMENT ----------------
    def unload_model(self, model_path: str) -> bool:
        resolved_path = self.resolve_model_path(model_path)
        key = self._make_key(resolved_path)
        with self.model_lock:
            if key in self.model_cache:
                del self.model_cache[key]
                logger.info("Unloaded model: %s", resolved_path)
                return True
        return False

    def clear_cache(self):
        with self.model_lock:
            self.model_cache.clear()
            logger.info("Cache cleared")

    def purge_idle_models(self) -> int:
        with self.model_lock:
            before = len(self.model_cache)
            self._evict_idle_models_locked(time.monotonic())
            return before - len(self.model_cache)

    def get_cache_info(self) -> dict[str, Any]:
        now = time.monotonic()

        with self.model_lock:
            return {
                "cached_models": len(self.model_cache),
                "max_size": self.max_cache_size,
                "max_idle_seconds": self.max_idle_seconds,
                "models": [
                    {
                        "key": key,
                        "idle_seconds": round(now - entry.last_used, 2),
                        "age_seconds": round(now - entry.loaded_at, 2),
                    }
                    for key, entry in self.model_cache.items()
                ],
            }

    # ---------------- OPTIONAL (ADVANCED) ----------------
    def preload_models(self, model_paths: list[str]):
        logger.info("Preloading %s models...", len(model_paths))
        for path in model_paths:
            try:
                self.load_model(path)
            except Exception:
                logger.warning("Failed to preload model: %s", path)

    def start_cleanup_thread(self, interval: int = 60):
        def cleanup():
            while True:
                time.sleep(interval)
                removed = self.purge_idle_models()
                if removed:
                    logger.info("Background cleanup removed %s models", removed)

        thread = threading.Thread(target=cleanup, daemon=True)
        thread.start()
        logger.info("Started background cleanup thread")


# ---------------- GLOBAL INSTANCE ----------------
_model_service = ModelService()


def get_model_instance(model_path: str) -> YOLO:
    return _model_service.load_model(model_path)


def get_models_for_product(db, product_code_id: int):
    models = get_models_by_product_code(db, product_code_id)

    loaded_models = []
    for model in models:
        instance = get_model_instance(model.model_path)
        loaded_models.append({
            "model": instance,
            "meta": model,
        })

    return loaded_models
