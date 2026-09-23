"""Amazon S3 storage adapter.

Objects are stored under ``products/<uuid>.<ext>`` and referenced only by that
key in the database, mirroring the local adapter's behavior. The boto3 client is
created lazily so importing this module (or the application) never requires AWS
credentials; they are only needed at runtime when ``STORAGE_MODE=s3``.

The public image URL favours a configured ``AWS_S3_PUBLIC_URL`` CDN/base prefix
and falls back to the standard S3 virtual-hosted bucket URL
(``https://<bucket>.s3.<region>.amazonaws.com/<key>``). Product buckets are
expected to be public-read for product images; credentials are never embedded
in URLs.
"""

import asyncio
import logging
import posixpath
from urllib.parse import urlparse

from app.core.config import Settings
from app.storage.base import PRODUCT_KEY_PREFIX, Storage, StorageError

logger = logging.getLogger(__name__)


class S3StorageAdapter(Storage):
    """Stores product images in a configured Amazon S3 bucket."""

    def __init__(self, settings: Settings) -> None:
        missing = [
            name
            for name, value in (
                ("AWS_ACCESS_KEY_ID", settings.aws_access_key_id),
                ("AWS_SECRET_ACCESS_KEY", settings.aws_secret_access_key),
                ("AWS_S3_BUCKET", settings.aws_s3_bucket),
            )
            if not value
        ]
        if missing:
            raise ValueError("STORAGE_MODE=s3 requires: " + ", ".join(missing))
        self._access_key_id = settings.aws_access_key_id
        self._secret_access_key = settings.aws_secret_access_key
        self._region = settings.aws_region
        self._bucket_name = settings.aws_s3_bucket
        self._public_url = settings.aws_s3_public_url.strip().rstrip("/")
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3

            try:
                self._client = boto3.client(
                    "s3",
                    region_name=self._region,
                    aws_access_key_id=self._access_key_id,
                    aws_secret_access_key=self._secret_access_key,
                )
            except Exception as exc:  # noqa: BLE001 - botocore raises many types
                raise StorageError(f"S3 client creation failed: {exc}") from exc
        return self._client

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        logger.info("Uploading S3 object %s (%d bytes)", key, len(data))
        try:
            await asyncio.to_thread(
                self._get_client().put_object,
                Bucket=self._bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageError(f"S3 upload failed for {key}: {exc}") from exc

    async def delete(self, key_or_url: str) -> None:
        key = self.extract_key_from_url(key_or_url) or key_or_url
        if not key:
            return
        try:
            await asyncio.to_thread(
                self._get_client().delete_object, Bucket=self._bucket_name, Key=key
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageError(f"S3 delete failed for {key}: {exc}") from exc

    def public_url(self, key: str) -> str:
        if self._public_url:
            return posixpath.join(self._public_url, key)
        if self._region:
            host = f"{self._bucket_name}.s3.{self._region}.amazonaws.com"
        else:
            host = f"{self._bucket_name}.s3.amazonaws.com"
        return posixpath.join(f"https://{host}", key)

    def extract_key_from_url(self, url: str) -> str | None:
        if self._public_url and url.startswith(self._public_url):
            remainder = url[len(self._public_url) :].lstrip("/")
            if remainder.startswith(PRODUCT_KEY_PREFIX):
                return posixpath.normpath(remainder)
        parsed = urlparse(url)
        path = parsed.path.lstrip("/")
        # Path-style URLs are: <bucket>/products/<key>
        if path.startswith(f"{self._bucket_name}/"):
            candidate = path.split("/", 1)[1]
            if candidate.startswith(PRODUCT_KEY_PREFIX):
                return posixpath.normpath(candidate)
        # Generic fallback: find the key under products/.
        if PRODUCT_KEY_PREFIX in path:
            tail = path[path.index(PRODUCT_KEY_PREFIX) :]
            return posixpath.normpath(tail)
        return None

    def file_exists(self, key: str) -> bool:
        try:
            self._get_client().head_object(Bucket=self._bucket_name, Key=key)
            return True
        except Exception:  # noqa: BLE001
            return False
