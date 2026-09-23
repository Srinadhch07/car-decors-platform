"""Tests for image validation and the storage adapters."""

import io
from pathlib import Path

import pytest
from fastapi import UploadFile
from pydantic import ValidationError
from starlette.datastructures import Headers

from app.core.config import Settings
from app.storage.base import (
    StorageError,
    TooLargeImageError,
    UnsupportedImageError,
    build_storage,
)
from app.storage.images import UploadedImage, validate_image_upload

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 8
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8
WEBP_BYTES = b"RIFF\x12\x34\x56\x78WEBPVP8 " + b"\x00" * 4


def make_upload(
    data: bytes, *, filename: str = "photo.jpg", content_type: str = "image/jpeg"
) -> UploadFile:
    return UploadFile(
        file=io.BytesIO(data),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def settings_with_max_bytes(size: int) -> Settings:
    return Settings(product_image_max_bytes=size)


@pytest.mark.parametrize(
    ("data", "filename", "content_type", "expected_type"),
    [
        (JPEG_BYTES, "photo.jpg", "image/jpeg", "image/jpeg"),
        (JPEG_BYTES, "photo.jpeg", "image/jpeg", "image/jpeg"),
        (PNG_BYTES, "photo.png", "image/png", "image/png"),
        (WEBP_BYTES, "photo.webp", "image/webp", "image/webp"),
    ],
)
async def test_valid_image_uploads_are_accepted(
    data: bytes, filename: str, content_type: str, expected_type: str
) -> None:
    image = await validate_image_upload(
        settings_with_max_bytes(5 * 1024 * 1024),
        make_upload(data, filename=filename, content_type=content_type),
    )

    assert isinstance(image, UploadedImage)
    assert image.content_type == expected_type
    assert image.key.startswith("products/")
    expected_extension = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[expected_type]
    assert image.key.endswith(expected_extension)


async def test_unsupported_content_type_rejected() -> None:
    with pytest.raises(UnsupportedImageError):
        await validate_image_upload(
            settings_with_max_bytes(5 * 1024 * 1024),
            make_upload(b"<html>", filename="x.html", content_type="text/html"),
        )


async def test_extension_content_type_mismatch_rejected() -> None:
    with pytest.raises(UnsupportedImageError):
        await validate_image_upload(
            settings_with_max_bytes(5 * 1024 * 1024),
            make_upload(JPEG_BYTES, filename="photo.png", content_type="image/png"),
        )


async def test_signature_mismatch_rejected() -> None:
    with pytest.raises(UnsupportedImageError):
        # PNG bytes hiding behind a JPEG content type.
        await validate_image_upload(
            settings_with_max_bytes(5 * 1024 * 1024),
            make_upload(PNG_BYTES, filename="photo.jpg", content_type="image/jpeg"),
        )


async def test_oversized_image_rejected() -> None:
    oversized = JPEG_BYTES + bytes(5 * 1024 * 1024)

    with pytest.raises(TooLargeImageError):
        await validate_image_upload(
            settings_with_max_bytes(5 * 1024 * 1024),
            make_upload(oversized, filename="big.jpg", content_type="image/jpeg"),
        )


async def test_empty_image_rejected_as_signature_mismatch() -> None:
    with pytest.raises(UnsupportedImageError):
        await validate_image_upload(
            settings_with_max_bytes(5 * 1024 * 1024),
            make_upload(b"", filename="empty.jpg", content_type="image/jpeg"),
        )


# ---------------------------------------------------------------------------
# Local adapter
# ---------------------------------------------------------------------------


async def test_local_adapter_round_trip(tmp_path: Path) -> None:
    adapter = build_storage(Settings(storage_local_dir=str(tmp_path)))

    await adapter.upload("products/abc.jpg", JPEG_BYTES, "image/jpeg")

    target = tmp_path / "products" / "abc.jpg"
    assert target.is_file()
    assert target.read_bytes() == JPEG_BYTES

    url = adapter.public_url("products/abc.jpg")
    assert url == "/media/products/abc.jpg"
    assert adapter.extract_key_from_url(url) == "products/abc.jpg"
    assert adapter.file_exists("products/abc.jpg") is True


async def test_local_adapter_delete_is_idempotent(tmp_path: Path) -> None:
    adapter = build_storage(Settings(storage_local_dir=str(tmp_path)))

    await adapter.upload("products/x.png", PNG_BYTES, "image/png")
    await adapter.delete("products/x.png")
    assert (tmp_path / "products" / "x.png").exists() is False

    await adapter.delete("products/x.png")  # already gone: no-op


async def test_local_adapter_rejects_traversal_keys(tmp_path: Path) -> None:
    adapter = build_storage(Settings(storage_local_dir=str(tmp_path)))

    with pytest.raises(StorageError):
        await adapter.upload("products/../evil.jpg", b"x", "image/jpeg")


async def test_local_adapter_ignores_foreign_urls(tmp_path: Path) -> None:
    adapter = build_storage(Settings(storage_local_dir=str(tmp_path)))

    assert adapter.extract_key_from_url("https://cdn.other/path.jpg") is None
    await adapter.delete("https://cdn.other/path.jpg")  # no-op


def test_build_storage_defaults_to_local(tmp_path: Path) -> None:
    adapter = build_storage(Settings(storage_local_dir=str(tmp_path)))
    assert type(adapter).__name__ == "LocalStorageAdapter"


def test_s3_mode_requires_credentials(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        build_storage(
            Settings(
                storage_mode="s3",
                storage_local_dir=str(tmp_path),
                _env_file=None,
            )
        )


def test_invalid_storage_mode_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(storage_mode="gcs")


# ---------------------------------------------------------------------------
# S3 adapter pure logic (mocked boto3, no credentials needed)
# ---------------------------------------------------------------------------

S3_SETTINGS = {
    "storage_mode": "s3",
    "aws_access_key_id": "k",
    "aws_secret_access_key": "a",
    "aws_region": "us-east-1",
    "aws_s3_bucket": "bucket",
}


def test_s3_public_url_and_key_extraction_with_default_host() -> None:
    from app.storage.s3 import S3StorageAdapter

    adapter = S3StorageAdapter(Settings(**S3_SETTINGS))

    url = adapter.public_url("products/abc123.jpg")
    assert url == "https://bucket.s3.us-east-1.amazonaws.com/products/abc123.jpg"
    assert adapter.extract_key_from_url(url) == "products/abc123.jpg"


def test_s3_public_url_and_key_extraction_with_public_cdn_prefix() -> None:
    from app.storage.s3 import S3StorageAdapter

    settings = dict(S3_SETTINGS, aws_s3_public_url="https://images.example.com")
    adapter = S3StorageAdapter(Settings(**settings))

    url = adapter.public_url("products/abc123.jpg")
    assert url == "https://images.example.com/products/abc123.jpg"
    assert adapter.extract_key_from_url(url) == "products/abc123.jpg"


def test_s3_key_extraction_from_path_style_and_foreign_hosts() -> None:
    from app.storage.s3 import S3StorageAdapter

    adapter = S3StorageAdapter(Settings(**S3_SETTINGS))

    assert (
        adapter.extract_key_from_url("https://s3.us-east-1.amazonaws.com/bucket/products/uuid.jpg")
        == "products/uuid.jpg"
    )
    assert adapter.extract_key_from_url("https://example.com/logo.png") is None


async def test_s3_upload_calls_put_object_with_content_type(monkeypatch) -> None:
    import boto3

    from app.storage.s3 import S3StorageAdapter

    calls = {}

    class FakeClient:
        def put_object(self, **kwargs):
            calls["put_object"] = kwargs

    monkeypatch.setattr(boto3, "client", lambda *a, **kw: FakeClient())
    adapter = S3StorageAdapter(Settings(**S3_SETTINGS))

    await adapter.upload("products/abc.jpg", b"data", "image/jpeg")

    assert calls["put_object"]["Bucket"] == "bucket"
    assert calls["put_object"]["Key"] == "products/abc.jpg"
    assert calls["put_object"]["Body"] == b"data"
    assert calls["put_object"]["ContentType"] == "image/jpeg"


async def test_s3_delete_extracts_key_and_calls_delete_object(monkeypatch) -> None:
    import boto3

    from app.storage.s3 import S3StorageAdapter

    deleted = {}

    class FakeClient:
        def delete_object(self, **kwargs):
            deleted["delete_object"] = kwargs

    monkeypatch.setattr(boto3, "client", lambda *a, **kw: FakeClient())
    adapter = S3StorageAdapter(Settings(**S3_SETTINGS))

    assert adapter.extract_key_from_url("https://cdn.other/path.jpg") is None

    url = adapter.public_url("products/uuid.jpg")
    await adapter.delete(url)
    assert deleted["delete_object"]["Bucket"] == "bucket"
    assert deleted["delete_object"]["Key"] == "products/uuid.jpg"


async def test_s3_upload_failure_surfaces_as_storage_error(monkeypatch) -> None:
    import boto3

    from app.storage.base import StorageError
    from app.storage.s3 import S3StorageAdapter

    class FakeClient:
        def put_object(self, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(boto3, "client", lambda *a, **kw: FakeClient())
    adapter = S3StorageAdapter(Settings(**S3_SETTINGS))

    with pytest.raises(StorageError):
        await adapter.upload("products/abc.jpg", b"data", "image/jpeg")
