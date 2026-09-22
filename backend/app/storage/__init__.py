"""Storage adapters for product images.

The product service depends only on :class:`Storage`, so local development
tests run against :class:`LocalStorageAdapter` while deployment uses
:class:`B2StorageAdapter` without any business-logic changes.
"""

from app.storage.base import (
    ImageValidationError,
    Storage,
    StorageError,
    TooLargeImageError,
    UnsupportedImageError,
    build_storage,
)
from app.storage.dependencies import StorageDep, get_storage
from app.storage.local import LocalStorageAdapter

__all__ = [
    "ImageValidationError",
    "LocalStorageAdapter",
    "Storage",
    "StorageDep",
    "StorageError",
    "TooLargeImageError",
    "UnsupportedImageError",
    "build_storage",
    "get_storage",
]
