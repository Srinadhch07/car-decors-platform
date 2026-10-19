"""Work Gallery document and request/response schemas.

A gallery item is one image or video with descriptive metadata. New items are
always created as drafts (unpublished, not featured); publication and featuring
are separate, admin-controlled flags. The stored file never lives in MongoDB —
only its storage key and public URL are persisted.
"""

from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.base import BaseDocument, PyObjectId
from app.models.enums import GalleryMediaType

#: Bounded gallery metadata limits (documented contract).
MAX_GALLERY_TITLE_LENGTH = 200
MAX_GALLERY_DESCRIPTION_LENGTH = 1000
MAX_GALLERY_CATEGORY_LENGTH = 80
MAX_GALLERY_URL_LENGTH = 500
MAX_GALLERY_KEY_LENGTH = 300
MAX_GALLERY_MIME_LENGTH = 100
MAX_GALLERY_DISPLAY_ORDER = 1_000_000


def _clean_text(value: str) -> str:
    return value.strip()


def _reject_control_characters(value: str) -> str:
    """Reject NUL and friends while allowing normal line breaks/tabs."""
    if any(ord(char) < 32 and char not in "\n\t" for char in value):
        raise ValueError("must not contain control characters")
    return value


def _require_non_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("must not be blank")
    return value


def derive_gallery_title(filename: str | None, media_type: GalleryMediaType) -> str:
    """Derive a sensible default title from an uploaded filename.

    Falls back to the media kind's label when the filename has no usable stem,
    so every item always ends up with a non-blank title.
    """
    stem = Path(filename or "").stem.strip()
    if stem:
        return stem[:MAX_GALLERY_TITLE_LENGTH]
    return "Image" if media_type == GalleryMediaType.IMAGE else "Video"


class GalleryItem(BaseDocument):
    """A Work Gallery item as persisted in MongoDB."""

    title: str = Field(min_length=1, max_length=MAX_GALLERY_TITLE_LENGTH)
    description: str = Field(default="", max_length=MAX_GALLERY_DESCRIPTION_LENGTH)
    category: str | None = Field(default=None, max_length=MAX_GALLERY_CATEGORY_LENGTH)
    media_type: GalleryMediaType
    storage_key: str = Field(min_length=1, max_length=MAX_GALLERY_KEY_LENGTH)
    url: str = Field(min_length=1, max_length=MAX_GALLERY_URL_LENGTH)
    mime_type: str = Field(min_length=1, max_length=MAX_GALLERY_MIME_LENGTH)
    size_bytes: int = Field(default=0, ge=0)
    width: int | None = Field(default=None, ge=1)
    height: int | None = Field(default=None, ge=1)
    duration_seconds: float | None = Field(default=None, ge=0)
    is_published: bool = False
    is_featured: bool = False
    display_order: int = Field(default=0, ge=0, le=MAX_GALLERY_DISPLAY_ORDER)

    @field_validator("title", "description", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: str) -> str:
        return _reject_control_characters(value)

    @field_validator("category", mode="before")
    @classmethod
    def _strip_category_before(cls, value: object) -> object:
        if value is None or not isinstance(value, str):
            return value
        cleaned = value.strip()
        return cleaned or None

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _reject_control_characters(value)


class GalleryCreate(BaseModel):
    """Typed, validated metadata for creating a gallery item.

    Arrives from a multipart form whose raw strings are normalized into this
    model by :func:`build_gallery_create`; the media itself is validated
    separately and stored by the service.
    """

    title: str = Field(min_length=1, max_length=MAX_GALLERY_TITLE_LENGTH)
    description: str = Field(default="", max_length=MAX_GALLERY_DESCRIPTION_LENGTH)
    category: str | None = Field(default=None, max_length=MAX_GALLERY_CATEGORY_LENGTH)
    display_order: int | None = Field(default=None, ge=0, le=MAX_GALLERY_DISPLAY_ORDER)

    @field_validator("title", "description", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: str) -> str:
        return _reject_control_characters(value)

    @field_validator("category", mode="before")
    @classmethod
    def _strip_category_before(cls, value: object) -> object:
        if value is None or not isinstance(value, str):
            return value
        cleaned = value.strip()
        return cleaned or None

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _reject_control_characters(value)


class GalleryUpdate(BaseModel):
    """Typed, validated partial metadata update; omitted fields stay unchanged."""

    title: str | None = Field(
        default=None, min_length=1, max_length=MAX_GALLERY_TITLE_LENGTH
    )
    description: str | None = Field(
        default=None, max_length=MAX_GALLERY_DESCRIPTION_LENGTH
    )
    category: str | None = Field(default=None, max_length=MAX_GALLERY_CATEGORY_LENGTH)
    display_order: int | None = Field(default=None, ge=0, le=MAX_GALLERY_DISPLAY_ORDER)

    @field_validator("title", "description", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("description")
    @classmethod
    def _validate_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _reject_control_characters(value)


class GalleryRead(BaseModel):
    """A gallery item as exposed to the public.

    Built only from documents already verified as published, so storage keys,
    size, and moderation/visibility flags are never part of this schema.
    """

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    title: str
    description: str = ""
    category: str | None = None
    media_type: GalleryMediaType
    url: str
    mime_type: str
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    created_at: datetime


class GalleryAdminRead(GalleryRead):
    """Full admin view including storage key and visibility flags."""

    storage_key: str
    size_bytes: int = 0
    is_published: bool = False
    is_featured: bool = False
    display_order: int = 0
    updated_at: datetime


class GalleryListPage(BaseModel):
    """Bounded, paginated public gallery listing."""

    items: list[GalleryRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class GalleryAdminListPage(BaseModel):
    """Paginated admin listing whose items carry visibility flags."""

    items: list[GalleryAdminRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class GalleryBatchFailure(BaseModel):
    """A single file in a batch upload that failed validation."""

    filename: str
    detail: str


class GalleryBatchResult(BaseModel):
    """Outcome of a batch upload: created items plus per-file rejections."""

    items: list[GalleryAdminRead]
    failures: list[GalleryBatchFailure]


class GalleryPublicationRequest(BaseModel):
    """Body for the admin publish/unpublish endpoint."""

    is_published: bool


class GalleryFeaturedRequest(BaseModel):
    """Body for the admin feature/unfeature endpoint."""

    is_featured: bool


class GalleryOrderRequest(BaseModel):
    """Body for the admin display-order endpoint."""

    display_order: int = Field(ge=0, le=MAX_GALLERY_DISPLAY_ORDER)


def _optional(raw: str | None) -> Any | None:
    """Map an empty multipart field to ``None``."""
    if raw is None or raw == "":
        return None
    return raw


def _parse_display_order(raw: str | None) -> int | None:
    if raw is None or raw == "":
        return None
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        raise ValueError("display_order must be a non-negative integer") from None
    if value < 0:
        raise ValueError("display_order must be a non-negative integer")
    return value


def build_gallery_create(raw: dict[str, str | None]) -> GalleryCreate:
    """Normalize raw multipart values into a validated create payload.

    Raises ``ValueError`` on well-formed-but-invalid values (bad
    ``display_order``); type-level errors surface as ``ValidationError``.
    """
    return GalleryCreate(
        title=(raw.get("title") or "").strip(),
        description=(raw.get("description") or "").strip(),
        category=_optional(raw.get("category")),
        display_order=_parse_display_order(raw.get("display_order")),
    )


def build_gallery_update(raw: dict[str, str | None]) -> GalleryUpdate:
    """Normalize raw multipart values into a validated update payload.

    Absent fields are left unchanged. A ``clear_fields`` comma-separated list
    signals which optional fields to clear (set to ``None``), since FastAPI's
    ``Form()`` collapses empty strings to ``None`` for optional fields.
    """
    clear_fields_str = raw.get("clear_fields") or ""
    clear_fields = {field.strip() for field in clear_fields_str.split(",") if field.strip()}

    changes: dict[str, Any] = {}
    for key in ("title", "description"):
        value = raw.get(key)
        if value is not None:
            changes[key] = value.strip()
    if "category" in clear_fields:
        changes["category"] = None
    else:
        category = raw.get("category")
        if category is not None and category.strip():
            changes["category"] = category.strip()
    order_raw = raw.get("display_order")
    if order_raw is not None and order_raw != "":
        changes["display_order"] = _parse_display_order(order_raw)
    return GalleryUpdate(**changes)


__all__ = [
    "MAX_GALLERY_CATEGORY_LENGTH",
    "MAX_GALLERY_DESCRIPTION_LENGTH",
    "MAX_GALLERY_DISPLAY_ORDER",
    "MAX_GALLERY_KEY_LENGTH",
    "MAX_GALLERY_MIME_LENGTH",
    "MAX_GALLERY_TITLE_LENGTH",
    "MAX_GALLERY_URL_LENGTH",
    "GalleryAdminListPage",
    "GalleryAdminRead",
    "GalleryBatchFailure",
    "GalleryBatchResult",
    "GalleryCreate",
    "GalleryFeaturedRequest",
    "GalleryItem",
    "GalleryListPage",
    "GalleryOrderRequest",
    "GalleryPublicationRequest",
    "GalleryRead",
    "GalleryUpdate",
    "build_gallery_create",
    "build_gallery_update",
    "derive_gallery_title",
]
