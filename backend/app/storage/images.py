"""Product image upload validation.

Only common web image formats are accepted (JPEG, PNG, WEBP). Validation
covers the client content type, the file extension, a magic-byte signature
sniff, and a strictly bounded size read so oversized uploads cannot flood
memory before a rejection.
"""

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from app.core.config import Settings
from app.storage.base import PRODUCT_KEY_PREFIX, TooLargeImageError, UnsupportedImageError

logger = logging.getLogger(__name__)

#: Allowed content types mapped to the canonical extension used for the object key.
CONTENT_TYPE_EXTENSIONS: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

#: Allowed extensions per content type; client-claimed extension must agree.
ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
}

#: Magic-byte signatures per content type for defense in depth.
#: Each entry is (signature bytes, offset within the file where they must appear).
CONTENT_TYPE_SIGNATURES: dict[str, tuple[bytes, int]] = {
    "image/jpeg": (b"\xff\xd8\xff", 0),
    "image/png": (b"\x89PNG\r\n\x1a\n", 0),
    "image/webp": (b"WEBP", 8),
}

_CHUNK_SIZE = 64 * 1024


@dataclass(frozen=True)
class UploadedImage:
    """Validated image ready for storage."""

    key: str
    content_type: str
    data: bytes


def _sniff_signature(image_type: str, data: bytes) -> bool:
    signature, offset = CONTENT_TYPE_SIGNATURES[image_type]
    return data[offset : offset + len(signature)] == signature


async def validate_image_upload(settings: Settings, upload: UploadFile) -> UploadedImage:
    """Validate an uploaded image and return its bounded byte payload.

    Raises :class:`UnsupportedImageError` for disallowed types/extensions or a
    signature mismatch, and :class:`TooLargeImageError` above the configured
    maximum so the caller can map them to 400/413 responses.
    """
    content_type = (upload.content_type or "").lower()
    if content_type not in CONTENT_TYPE_EXTENSIONS:
        raise UnsupportedImageError(
            f"Unsupported image type '{upload.content_type or 'unknown'}'. "
            "Allowed: image/jpeg, image/png, image/webp."
        )

    filename = upload.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS[content_type]:
        raise UnsupportedImageError(
            f"File extension '{extension or 'missing'}' does not match "
            f"content type '{content_type}'."
        )

    if upload.size is not None and upload.size > settings.product_image_max_bytes:
        raise TooLargeImageError(f"Image exceeds the {settings.product_image_max_bytes} byte limit")

    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(_CHUNK_SIZE):
        total += len(chunk)
        if total > settings.product_image_max_bytes:
            raise TooLargeImageError(
                f"Image exceeds the {settings.product_image_max_bytes} byte limit"
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not _sniff_signature(content_type, data):
        raise UnsupportedImageError(f"File content does not match content type '{content_type}'")

    key = f"{PRODUCT_KEY_PREFIX}{uuid.uuid4()}{CONTENT_TYPE_EXTENSIONS[content_type]}"
    logger.info("Validated image upload for key %s (%d bytes)", key, total)
    return UploadedImage(key=key, content_type=content_type, data=data)
