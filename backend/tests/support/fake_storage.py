"""In-memory storage used by tests so no credentials are required."""

from app.core.config import Settings
from app.storage.base import Storage, StorageError, build_storage

FILES_PREFIX = "https://files.test/"


class MemoStorage(Storage):
    """A fake object store recording uploads and deletions.

    Tests can enable failure injection to exercise storage error paths.
    """

    def __init__(self) -> None:
        self.objects: set[str] = set()
        self.deleted: list[str] = []
        self.fail_upload = False
        self.fail_delete = False

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        if self.fail_upload:
            raise StorageError("upload injection failure")
        self.objects.add(key)

    async def delete(self, key_or_url: str) -> None:
        if self.fail_delete:
            raise StorageError("delete injection failure")
        key = self.extract_key_from_url(key_or_url) or key_or_url
        self.deleted.append(key)
        self.objects.discard(key)

    def public_url(self, key: str) -> str:
        return f"{FILES_PREFIX}{key}"

    def extract_key_from_url(self, url: str) -> str | None:
        if url and url.startswith(FILES_PREFIX):
            return url[len(FILES_PREFIX) :]
        if url and "products/" in url:
            return url[url.index("products/") :]
        return None

    def file_exists(self, key: str) -> bool:
        return key in self.objects


def local_storage(tmp_path) -> Storage:
    """Build a real LocalStorageAdapter rooted in ``tmp_path``."""
    settings = Settings(storage_local_dir=str(tmp_path))
    adapter = build_storage(settings)
    assert isinstance(adapter, Storage)
    return adapter
