"""Development-safe local storage adapter.

Files are written under a configurable directory and exposed through a
root-relative path (``/media/<key>``). The FastAPI app mounts a static handler
at ``/media`` when this adapter is active, so local development behaves like a
real object store without any credentials.
"""

import logging
import posixpath
from pathlib import Path

from app.storage.base import PRODUCT_KEY_PREFIX, Storage, StorageError

logger = logging.getLogger(__name__)

_MEDIA_PREFIX = "/media/"


class LocalStorageAdapter(Storage):
    """Stores objects on the local filesystem under ``root``."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Guard against path traversal: only direct prefix children are allowed.
        if ".." in key.split("/") or key.startswith("/"):
            raise StorageError(f"unsafe object key: {key!r}")
        return self.root / key

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        path = self._resolve(key)
        logger.info("Storing local object %s (%d bytes)", key, len(data))
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        except OSError as exc:
            raise StorageError(f"local upload failed for {key}: {exc}") from exc

    async def delete(self, key_or_url: str) -> None:
        key = self.extract_key_from_url(key_or_url) or key_or_url
        if not key:
            return
        path = self._resolve(key)
        if not path.exists():
            # Deleting an absent object is a no-op success (idempotent cleanup).
            return
        logger.info("Deleting local object %s", key)
        try:
            path.unlink()
        except OSError as exc:
            raise StorageError(f"local delete failed for {key}: {exc}") from exc

    def public_url(self, key: str) -> str:
        return posixpath.join(_MEDIA_PREFIX.rstrip("/"), key)

    def extract_key_from_url(self, url: str) -> str | None:
        if not url.startswith(_MEDIA_PREFIX):
            return None
        key = posixpath.normpath(url[len(_MEDIA_PREFIX) :])
        if key == "." or not key.startswith(PRODUCT_KEY_PREFIX):
            return None
        return key

    def file_exists(self, key: str) -> bool:
        return self._resolve(key).is_file()
