"""Product document and request/response schemas.

B5 uses one image per product. ``image_url`` is the public URL returned by the
storage adapter; the file itself never lives in MongoDB.
"""

import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import is_http_url
from app.models.base import SLUG_PATTERN, BaseDocument, Money, PyObjectId
from app.models.enums import Availability

#: Bounded product text and tag limits (documented contract).
MAX_PRODUCT_NAME_LENGTH = 200
MAX_PRODUCT_SLUG_LENGTH = 200
MAX_PRODUCT_DESCRIPTION_LENGTH = 2000
MAX_PRODUCT_TAGS = 12
MAX_PRODUCT_TAG_LENGTH = 60
MAX_IMAGE_URL_LENGTH = 500
MAX_EXTERNAL_URL_LENGTH = 500


def _normalize_external_url(value: object) -> object:
    """Return a validated external URL, ``None`` for blank, else raise.

    Only absolute http(s) URLs with a host are accepted so unsafe schemes such
    as ``javascript:`` / ``data:``, malformed values, and control characters
    are rejected.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("external_url must be a string")
    cleaned = value.strip()
    if not cleaned:
        return None
    if any(ord(char) < 32 for char in cleaned):
        raise ValueError("external_url contains control characters")
    if not is_http_url(cleaned):
        raise ValueError("external_url must be an absolute http(s) URL")
    return cleaned


def _clean_name(value: str) -> str:
    return value.strip()


def _require_non_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("name cannot be blank")
    return value


def _clean_vehicle_tags(value: list[str]) -> list[str]:
    """Trim tags, drop empties, and bound length and count."""
    if not isinstance(value, list):
        raise ValueError("vehicle_tags must be a list of strings")
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError("each vehicle tag must be a string")
        tag = item.strip()
        if not tag:
            continue
        if len(tag) > MAX_PRODUCT_TAG_LENGTH:
            raise ValueError(f"vehicle tag exceeds {MAX_PRODUCT_TAG_LENGTH} characters")
        cleaned.append(tag)
    if len(cleaned) > MAX_PRODUCT_TAGS:
        raise ValueError(f"at most {MAX_PRODUCT_TAGS} vehicle tags are allowed")
    return cleaned


class Product(BaseDocument):
    """A product belonging to one category and optionally one subcategory."""

    category_id: PyObjectId
    subcategory_id: PyObjectId | None = None
    name: str = Field(min_length=1, max_length=MAX_PRODUCT_NAME_LENGTH)
    slug: str = Field(pattern=SLUG_PATTERN, max_length=MAX_PRODUCT_SLUG_LENGTH)
    description: str = Field(default="", max_length=MAX_PRODUCT_DESCRIPTION_LENGTH)
    price: Money | None = None
    availability: Availability = Availability.OUT_OF_STOCK
    #: Exact stock quantity (admin-only); legacy products without this field
    #: are treated as having zero stock.
    stock_quantity: int = Field(default=0, ge=0)
    #: Optional external URL (video, product page, ...); http(s) only.
    external_url: str | None = Field(default=None, max_length=MAX_EXTERNAL_URL_LENGTH)
    is_active: bool = True
    vehicle_tags: list[str] = Field(default_factory=list, max_length=MAX_PRODUCT_TAGS)
    #: Single public image URL; file storage is handled by the storage adapter.
    image_url: str | None = Field(default=None, max_length=MAX_IMAGE_URL_LENGTH)

    @field_validator("external_url", mode="before")
    @classmethod
    def _validate_external_url(cls, value: object) -> object:
        return _normalize_external_url(value)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name_before(cls, value: object) -> object:
        return _clean_name(value) if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def _reject_blank_name(cls, value: str) -> str:
        return _require_non_blank(value)

    @field_validator("description", mode="before")
    @classmethod
    def _strip_description(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("vehicle_tags")
    @classmethod
    def _validate_vehicle_tags(cls, value: list[str]) -> list[str]:
        return _clean_vehicle_tags(value)


class ProductCreate(BaseModel):
    """Typed, validated input for creating a product.

    Arrives from a multipart form whose raw strings are normalized into this
    model by :func:`build_product_create`; the type coercion (ObjectId, Money,
    enum, bool) applies here.
    """

    category_id: PyObjectId
    subcategory_id: PyObjectId | None = None
    name: str = Field(min_length=1, max_length=MAX_PRODUCT_NAME_LENGTH)
    description: str = Field(default="", max_length=MAX_PRODUCT_DESCRIPTION_LENGTH)
    price: Money | None = None
    availability: Availability = Availability.OUT_OF_STOCK
    stock_quantity: int = Field(default=0, ge=0)
    external_url: str | None = Field(default=None, max_length=MAX_EXTERNAL_URL_LENGTH)
    is_active: bool = True
    vehicle_tags: list[str] = Field(default_factory=list, max_length=MAX_PRODUCT_TAGS)

    @field_validator("external_url", mode="before")
    @classmethod
    def _validate_external_url(cls, value: object) -> object:
        return _normalize_external_url(value)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name_before(cls, value: object) -> object:
        return _clean_name(value) if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def _reject_blank_name(cls, value: str) -> str:
        return _require_non_blank(value)

    @field_validator("description", mode="before")
    @classmethod
    def _strip_description(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("vehicle_tags", mode="before")
    @classmethod
    def _validate_vehicle_tags_before(cls, value: object) -> object:
        return _clean_vehicle_tags(value) if isinstance(value, list) else value

    @field_validator("vehicle_tags")
    @classmethod
    def _validate_vehicle_tags(cls, value: list[str]) -> list[str]:
        return _clean_vehicle_tags(value)


class ProductUpdate(BaseModel):
    """Typed, validated partial update; omitted fields stay unchanged."""

    category_id: PyObjectId | None = None
    subcategory_id: PyObjectId | None = None
    name: str | None = Field(default=None, min_length=1, max_length=MAX_PRODUCT_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_PRODUCT_DESCRIPTION_LENGTH)
    price: Money | None = None
    availability: Availability | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    external_url: str | None = Field(default=None, max_length=MAX_EXTERNAL_URL_LENGTH)
    is_active: bool | None = None
    vehicle_tags: list[str] | None = None

    @field_validator("external_url", mode="before")
    @classmethod
    def _validate_external_url(cls, value: object) -> object:
        return _normalize_external_url(value)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name_before(cls, value: object) -> object:
        return _clean_name(value) if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def _reject_blank_name(cls, value: str) -> str:
        return _require_non_blank(value)

    @field_validator("description", mode="before")
    @classmethod
    def _strip_description(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("vehicle_tags", mode="before")
    @classmethod
    def _validate_vehicle_tags_before(cls, value: object) -> object:
        if value is None:
            return value
        return _clean_vehicle_tags(value) if isinstance(value, list) else value


def _coerce_bool(raw: str | None) -> bool:
    if raw is None or raw == "":
        return True
    if raw.strip().lower() in {"true", "1", "yes"}:
        return True
    if raw.strip().lower() in {"false", "0", "no"}:
        return False
    raise ValueError(f"is_active must be true or false, got {raw!r}")


def _parse_tags(raw: str | None) -> list[str]:
    """Parse the JSON-encoded ``vehicle_tags`` multipart field."""
    if raw is None or raw == "":
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("vehicle_tags must be a valid JSON array of strings") from exc
    if not isinstance(parsed, list):
        raise ValueError("vehicle_tags must be a JSON array of strings")
    for item in parsed:
        if not isinstance(item, str):
            raise ValueError("vehicle_tags must be a JSON array of strings")
    return _clean_vehicle_tags(parsed)


def _as_optional(raw: str | None) -> Any | None:
    """Map an empty multipart field to ``None`` (used on create)."""
    if raw is None or raw == "":
        return None
    return raw


def _parse_stock(raw: str | None) -> int:
    """Parse a ``stock_quantity`` multipart field into a non-negative integer.

    Missing/blank values become zero so new products default to zero stock;
    anything that is not a whole number is rejected.
    """
    if raw is None or raw == "":
        return 0
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        raise ValueError("stock_quantity must be a non-negative integer") from None
    if value < 0:
        raise ValueError("stock_quantity must be a non-negative integer")
    return value


def build_product_create(raw: dict[str, str | None]) -> ProductCreate:
    """Normalize raw multipart form values into a validated create payload.

    Raises ``ValueError`` on well-formed-but-invalid values (bad boolean,
    malformed JSON tags); type-level errors surface as ``ValidationError``.
    """
    return ProductCreate(
        category_id=raw["category_id"],
        subcategory_id=_as_optional(raw.get("subcategory_id")),
        name=raw["name"],
        description=(raw.get("description") or "").strip(),
        price=_as_optional(raw.get("price")),
        availability=raw.get("availability") or Availability.OUT_OF_STOCK.value,
        stock_quantity=_parse_stock(raw.get("stock_quantity")),
        external_url=raw.get("external_url"),
        is_active=_coerce_bool(raw.get("is_active")),
        vehicle_tags=_parse_tags(raw.get("vehicle_tags")),
    )


def build_product_update(raw: dict[str, str | None]) -> ProductUpdate:
    """Normalize raw multipart form values into a validated update payload.

    Present-but-empty fields mean "clear": an empty ``subcategory_id`` detaches
    the subcategory, empty ``price`` clears the price, an empty ``external_url``
    clears the link, and an empty ``vehicle_tags`` empties the tag list. Absent
    fields are left unchanged.

    Because FastAPI's ``Form()`` converts empty strings to ``None`` for optional
    string fields, the client uses a ``clear_fields`` comma-separated list to
    signal which fields should be cleared (set to ``None``/empty).
    """
    clear_fields_str = raw.get("clear_fields") or ""
    clear_fields = {f.strip() for f in clear_fields_str.split(",") if f.strip()}

    changes: dict[str, Any] = {}
    for key in ("name", "description", "category_id"):
        value = raw.get(key)
        if value is not None:
            changes[key] = value
    for key in ("price", "subcategory_id", "external_url"):
        if key in clear_fields:
            changes[key] = None
        else:
            value = raw.get(key)
            if value is not None and value != "":
                changes[key] = value
    availability = raw.get("availability")
    if availability not in (None, ""):
        changes["availability"] = availability
    stock_raw = raw.get("stock_quantity")
    if stock_raw is not None and stock_raw != "":
        changes["stock_quantity"] = _parse_stock(stock_raw)
    is_active = raw.get("is_active")
    if is_active is not None and is_active != "":
        changes["is_active"] = _coerce_bool(is_active)
    tags = raw.get("vehicle_tags")
    if tags is not None:
        changes["vehicle_tags"] = _parse_tags(tags)
    return ProductUpdate(**changes)


class ProductRead(BaseModel):
    """A product as exposed over the API (both admin and public)."""

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    category_id: PyObjectId
    subcategory_id: PyObjectId | None = None
    name: str
    slug: str
    description: str = ""
    price: Money | None = None
    availability: Availability = Availability.OUT_OF_STOCK
    external_url: str | None = None
    is_active: bool = True
    vehicle_tags: list[str] = Field(default_factory=list)
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime


class ProductListPage(BaseModel):
    """Bounded, paginated product listing with total metadata."""

    items: list[ProductRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class AdminProductRead(ProductRead):
    """Admin product view; adds the exact (admin-only) stock quantity."""

    stock_quantity: int = 0


class AdminProductListPage(BaseModel):
    """Paginated admin listing whose items carry exact stock quantities."""

    items: list[AdminProductRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class StockAdjustRequest(BaseModel):
    """Body for the atomic admin stock adjustment endpoint."""

    delta: int = Field(1, description="+1 to add one unit, -1 to remove one unit")


__all__ = [
    "MAX_EXTERNAL_URL_LENGTH",
    "MAX_IMAGE_URL_LENGTH",
    "MAX_PRODUCT_DESCRIPTION_LENGTH",
    "MAX_PRODUCT_NAME_LENGTH",
    "MAX_PRODUCT_SLUG_LENGTH",
    "MAX_PRODUCT_TAG_LENGTH",
    "MAX_PRODUCT_TAGS",
    "AdminProductListPage",
    "AdminProductRead",
    "Product",
    "ProductCreate",
    "ProductListPage",
    "ProductRead",
    "ProductUpdate",
    "StockAdjustRequest",
    "build_product_create",
    "build_product_update",
]
