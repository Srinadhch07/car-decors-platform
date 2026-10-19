"""Work Gallery media upload validation (images and MP4 video).

Only formats the storefront can already serve are accepted: the product image
allow-list (JPEG, PNG, WEBP) plus MP4 video. Validation covers the client
content type, the file extension, a magic-byte signature sniff, and a strictly
bounded size read so oversized uploads cannot flood memory before rejection.

Limits are per kind: images use ``gallery_image_max_bytes`` (4 MiB) and video
uses ``gallery_video_max_bytes`` (25 MiB).
"""

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from app.core.config import Settings
from app.storage.base import GALLERY_KEY_PREFIX, TooLargeMediaError, UnsupportedMediaError
from app.storage.images import ALLOWED_EXTENSIONS as IMAGE_ALLOWED_EXTENSIONS
from app.storage.images import CONTENT_TYPE_EXTENSIONS as IMAGE_CONTENT_TYPE_EXTENSIONS
from app.storage.images import CONTENT_TYPE_SIGNATURES as IMAGE_CONTENT_TYPE_SIGNATURES

logger = logging.getLogger(__name__)

IMAGE_MEDIA_TYPE = "image"
VIDEO_MEDIA_TYPE = "video"

#: Allowed gallery content types mapped to the canonical key extension.
CONTENT_TYPE_EXTENSIONS: dict[str, str] = {
    **IMAGE_CONTENT_TYPE_EXTENSIONS,
    "video/mp4": ".mp4",
}

#: Allowed extensions per content type; a client-claimed extension must agree.
ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    **IMAGE_ALLOWED_EXTENSIONS,
    "video/mp4": {".mp4"},
}

#: Magic-byte signatures per content type for defense in depth.
#: Each entry is (signature bytes, offset within the file where they must appear).
#: MP4 files start with an ISO-BMFF ``ftyp`` box whose type sits at offset 4.
CONTENT_TYPE_SIGNATURES: dict[str, tuple[bytes, int]] = {
    **IMAGE_CONTENT_TYPE_SIGNATURES,
    "video/mp4": (b"ftyp", 4),
}

#: Maps each allowed content type to its high-level media kind.
CONTENT_TYPE_MEDIA_TYPES: dict[str, str] = {
    **dict.fromkeys(IMAGE_CONTENT_TYPE_EXTENSIONS, IMAGE_MEDIA_TYPE),
    "video/mp4": VIDEO_MEDIA_TYPE,
}

_CHUNK_SIZE = 64 * 1024


@dataclass(frozen=True)
class UploadedMedia:
    """Validated gallery media ready for storage."""

    key: str
    content_type: str
    data: bytes
    media_type: str
    size: int
    filename: str


def _max_bytes(settings: Settings, media_type: str) -> int:
    if media_type == VIDEO_MEDIA_TYPE:
        return settings.gallery_video_max_bytes
    return settings.gallery_image_max_bytes


def _too_large_detail(media_type: str, max_bytes: int) -> str:
    label = "Video" if media_type == VIDEO_MEDIA_TYPE else "Image"
    return f"{label} exceeds the {max_bytes} byte limit"


def _sniff_signature(content_type: str, data: bytes) -> bool:
    signature, offset = CONTENT_TYPE_SIGNATURES[content_type]
    return data[offset : offset + len(signature)] == signature


def supported_content_types() -> str:
    """Return the comma-separated allow-list for error messages."""
    return ", ".join(sorted(CONTENT_TYPE_EXTENSIONS))


async def validate_media_upload(settings: Settings, upload: UploadFile) -> UploadedMedia:
    """Validate an uploaded gallery file and return its bounded byte payload.

    Raises :class:`UnsupportedMediaError` for disallowed types/extensions or a
    signature mismatch, and :class:`TooLargeMediaError` above the configured
    limit for the media kind so callers can map them to 400/413 responses.
    """
    content_type = (upload.content_type or "").lower()
    if content_type not in CONTENT_TYPE_EXTENSIONS:
        raise UnsupportedMediaError(
            f"Unsupported media type '{upload.content_type or 'unknown'}'. "
            f"Allowed: {supported_content_types()}."
        )
    media_type = CONTENT_TYPE_MEDIA_TYPES[content_type]

    filename = upload.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS[content_type]:
        raise UnsupportedMediaError(
            f"File extension '{extension or 'missing'}' does not match "
            f"content type '{content_type}'."
        )

    max_bytes = _max_bytes(settings, media_type)
    if upload.size is not None and upload.size > max_bytes:
        raise TooLargeMediaError(_too_large_detail(media_type, max_bytes))

    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(_CHUNK_SIZE):
        total += len(chunk)
        if total > max_bytes:
            raise TooLargeMediaError(_too_large_detail(media_type, max_bytes))
        chunks.append(chunk)

    data = b"".join(chunks)
    if not _sniff_signature(content_type, data):
        raise UnsupportedMediaError(f"File content does not match content type '{content_type}'")

    key = f"{GALLERY_KEY_PREFIX}{uuid.uuid4()}{CONTENT_TYPE_EXTENSIONS[content_type]}"
    logger.info("Validated gallery %s upload for key %s (%d bytes)", media_type, key, total)
    return UploadedMedia(
        key=key,
        content_type=content_type,
        data=data,
        media_type=media_type,
        size=total,
        filename=filename,
    )


__all__ = [
    "ALLOWED_EXTENSIONS",
    "CONTENT_TYPE_EXTENSIONS",
    "CONTENT_TYPE_MEDIA_TYPES",
    "CONTENT_TYPE_SIGNATURES",
    "IMAGE_MEDIA_TYPE",
    "VIDEO_MEDIA_TYPE",
    "UploadedMedia",
    "supported_content_types",
    "validate_media_upload",
]
