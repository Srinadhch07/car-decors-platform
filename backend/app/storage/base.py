"""Storage interface shared by the local and B2 adapters.

Only the operations B5 actually needs are exposed: upload, delete, public URL
generation, and key extraction. Keeping the surface small makes swapping the
backend (e.g. B2 for S3) possible without touching product business logic.
"""

from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import Settings


class StorageError(Exception):
    """Raised when an underlying storage operation fails."""


class ImageValidationError(Exception):
    """Raised when an uploaded image is rejected before any upload happens."""


class UnsupportedImageError(ImageValidationError):
    """The image content type / extension / signature is not allowed."""


class TooLargeImageError(ImageValidationError):
    """The image exceeds the configured maximum size."""


class Storage(ABC):
    """Minimal image storage contract used by the product service."""

    @abstractmethod
    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Persist ``data`` under ``key``. Errors surface as :class:`StorageError`."""

    @abstractmethod
    async def delete(self, key_or_url: str) -> None:
        """Delete the object identified by ``key_or_url``.

        Deleting an object that no longer exists is a no-op success; genuine
        failures raise :class:`StorageError`.
        """

    @abstractmethod
    def public_url(self, key: str) -> str:
        """Return the public URL clients use to fetch the object."""

    @abstractmethod
    def extract_key_from_url(self, url: str) -> str | None:
        """Return the object key embedded in ``url``, or ``None`` when foreign."""


def build_storage(settings: Settings) -> Storage:
    """Instantiate the storage adapter configured by ``settings``.

    The default mode is ``local`` so importing the application never requires
    B2 credentials. B2 mode fails fast with a clear message when credentials
    are missing.
    """
    mode = settings.storage_mode.lower()
    if mode == "local":
        from app.storage.local import LocalStorageAdapter

        return LocalStorageAdapter(Path(settings.storage_local_dir))
    if mode == "b2":
        from app.storage.b2 import B2StorageAdapter

        return B2StorageAdapter(settings)
    # Unreachable when config validation is active; defensive for direct use.
    raise ValueError(f"unknown storage_mode: {settings.storage_mode!r}")


_IMAGE_PREFIX = "products/"


def is_product_key(key: str | None) -> bool:
    """True when ``key`` looks like a B5 product image key."""
    return bool(key and key.startswith(_IMAGE_PREFIX) and len(key) > len(_IMAGE_PREFIX))


PRODUCT_KEY_PREFIX = _IMAGE_PREFIX
