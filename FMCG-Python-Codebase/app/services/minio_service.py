import io
import logging
from datetime import timedelta

from minio import Minio

from app.core.config import settings


logger = logging.getLogger(__name__)


class MinioService:
    def __init__(self):
        self._bucket_cache: set[str] = set()
        self._client = self._build_client(settings.MINIO_ENDPOINT)
        self._public_client = self._build_client(settings.MINIO_PUBLIC_ENDPOINT)

    def _build_client(self, endpoint: str) -> Minio:
        normalized_endpoint = endpoint.replace("http://", "").replace("https://", "")
        return Minio(
            normalized_endpoint,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
            region="us-east-1",
        )

    def _ensure_bucket(self, bucket_name: str):
        if bucket_name in self._bucket_cache:
            return

        exists = self._client.bucket_exists(bucket_name)
        if not exists:
            if not settings.MINIO_AUTO_CREATE_BUCKETS:
                raise RuntimeError(f"MinIO bucket does not exist: {bucket_name}")
            self._client.make_bucket(bucket_name)
            logger.info("Created MinIO bucket: %s", bucket_name)

        self._bucket_cache.add(bucket_name)

    def _clean_key(self, bucket_name: str, object_key: str) -> str:
        if not object_key:
            return object_key
        # Standardize separators
        object_key = object_key.replace("\\", "/")
        # Strip any bucket name prefixes if present
        for b_name in [bucket_name, settings.MINIO_INPUT_BUCKET, settings.MINIO_OUTPUT_BUCKET]:
            prefix = f"{b_name}/"
            if object_key.startswith(prefix):
                object_key = object_key[len(prefix):]
                break
        return object_key

    def put_bytes(self, bucket_name: str, object_key: str, data: bytes, content_type: str) -> str:
        self._ensure_bucket(bucket_name)
        object_key = self._clean_key(bucket_name, object_key)
        payload = io.BytesIO(data)
        self._client.put_object(
            bucket_name,
            object_key,
            payload,
            length=len(data),
            content_type=content_type,
        )
        return object_key

    def upload_file(self, bucket_name: str, object_key: str, file_path: str, content_type: str | None = None) -> str:
        self._ensure_bucket(bucket_name)
        object_key = self._clean_key(bucket_name, object_key)
        self._client.fput_object(bucket_name, object_key, file_path, content_type=content_type)
        return object_key

    def download_to_file(self, bucket_name: str, object_key: str, file_path: str):
        object_key = self._clean_key(bucket_name, object_key)
        self._client.fget_object(bucket_name, object_key, file_path)

    def delete_object(self, bucket_name: str, object_key: str):
        object_key = self._clean_key(bucket_name, object_key)
        self._client.remove_object(bucket_name, object_key)

    def presigned_get_url(self, bucket_name: str, object_key: str, expiry_seconds: int | None = None) -> str:
        expires = timedelta(seconds=expiry_seconds or settings.MINIO_PRESIGNED_URL_EXPIRY_SECONDS)
        object_key = self._clean_key(bucket_name, object_key)
        
        # Generate the presigned URL using the public client. Since the client is initialized
        # with region="us-east-1", it calculates the signature client-side for the public host
        # (localhost:9000) without trying to connect to it from the container network.
        return self._public_client.presigned_get_object(bucket_name, object_key, expires=expires)


_minio_service: MinioService | None = None


def get_minio_service() -> MinioService:
    global _minio_service
    if _minio_service is None:
        _minio_service = MinioService()
    return _minio_service