"""Backblaze B2 storage adapter.

Adapted from the project's proven B2 pattern built on the native SDK
(``b2sdk.v2`` with ``InMemoryAccountInfo``). Objects are stored under
``products/<uuid>.<ext>`` and referenced only by that key in the database.

The SDK is imported lazily, so importing this module (or the application) never
requires B2 credentials or an installed salesforce plugin; ``b2sdk`` is only
needed at runtime when ``STORAGE_MODE=b2``.
"""

import asyncio
import logging
import posixpath
from urllib.parse import urlparse

from app.core.config import Settings
from app.storage.base import PRODUCT_KEY_PREFIX, Storage, StorageError

logger = logging.getLogger(__name__)


class B2StorageAdapter(Storage):
    """Stores product images in a configured Backblaze B2 bucket."""

    def __init__(self, settings: Settings) -> None:
        missing = [
            name
            for name, value in (
                ("B2_KEY_ID", settings.b2_key_id),
                ("B2_APPLICATION_KEY", settings.b2_application_key),
                ("B2_BUCKET_NAME", settings.b2_bucket_name),
            )
            if not value
        ]
        if missing:
            raise ValueError("STORAGE_MODE=b2 requires: " + ", ".join(missing))
        self._key_id = settings.b2_key_id
        self._application_key = settings.b2_application_key
        self._bucket_name = settings.b2_bucket_name
        self._public_url = settings.b2_public_url.strip().rstrip("/")
        self._api = None
        self._cached_bucket = None

    def _client(self):
        if self._api is None:
            from b2sdk.v2 import B2Api, InMemoryAccountInfo

            info = InMemoryAccountInfo()
            api = B2Api(info)
            try:
                # Explicit application_key_id tokens are good forever; the
                # remainder of the key is checked at authorize time.
                api.authorize_account("production", self._key_id, self._application_key)
            except Exception as exc:  # noqa: BLE001 - SDK raises many types
                raise StorageError(f"B2 authorization failed: {exc}") from exc
            self._api = api
        return self._api

    def _get_bucket(self):
        if self._cached_bucket is None:
            try:
                self._cached_bucket = self._client().get_bucket_by_name(self._bucket_name)
            except Exception as exc:  # noqa: BLE001
                raise StorageError(f"B2 bucket lookup failed: {exc}") from exc
        return self._cached_bucket

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        logger.info("Uploading B2 object %s (%d bytes)", key, len(data))
        try:
            await asyncio.to_thread(
                self._get_bucket().upload_bytes, data, key, content_type=content_type
            )
        except Exception as exc:  # noqa: BLE001
            raise StorageError(f"B2 upload failed for {key}: {exc}") from exc

    async def delete(self, key_or_url: str) -> None:
        key = self.extract_key_from_url(key_or_url) or key_or_url
        if not key:
            return
        bucket = self._get_bucket()
        try:
            version = await asyncio.to_thread(bucket.get_file_info_by_name, key)
        except Exception as exc:  # noqa: BLE001
            # FileNotPresent and friends mean there is nothing to delete.
            logger.info("B2 object %s already absent (%s)", key, exc)
            return
        try:
            await asyncio.to_thread(bucket.delete_file_version, version.id_, key)
        except Exception as exc:  # noqa: BLE001
            raise StorageError(f"B2 delete failed for {key}: {exc}") from exc

    def public_url(self, key: str) -> str:
        if self._public_url:
            return posixpath.join(self._public_url, key)
        try:
            return self._get_bucket().get_download_url(key)
        except Exception as exc:  # noqa: BLE001
            raise StorageError(f"B2 download URL generation failed for {key}: {exc}") from exc

    def extract_key_from_url(self, url: str) -> str | None:
        for prefix in (self._public_url, "https://download.origin.example"):
            if prefix and url.startswith(prefix):
                remainder = url[len(prefix) :].lstrip("/")
                if remainder.startswith(PRODUCT_KEY_PREFIX):
                    return posixpath.normpath(remainder)
        # Handle B2 download URLs: https://<host>/file/<bucket>/<key>
        parsed = urlparse(url)
        path = parsed.path.lstrip("/")
        if path.startswith("file/"):
            parts = path.split("/", 2)
            if len(parts) >= 3:
                candidate = parts[2]
                if candidate.startswith(PRODUCT_KEY_PREFIX):
                    return posixpath.normpath(candidate)
        # Generic fallback: find the key under products/.
        marker = PRODUCT_KEY_PREFIX
        if marker in path:
            tail = path[path.index(marker) :]
            return posixpath.normpath(tail)
        return None

    def file_exists(self, key: str) -> bool:
        try:
            self._get_bucket().get_file_info_by_name(key)
            return True
        except Exception:  # noqa: BLE001
            return False
