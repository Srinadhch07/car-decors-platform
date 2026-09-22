"""Subcategory document, schemas, and public read model."""

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import validate_url_or_path
from app.models.base import SLUG_PATTERN, BaseDocument, PyObjectId

MAX_NAME_LENGTH = 120
MAX_IMAGE_URL_LENGTH = 500
MAX_SORT_ORDER = 10000


class Subcategory(BaseDocument):
    """A subcategory belonging to exactly one category."""

    category_id: PyObjectId
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str = Field(pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    image_url: str | None = Field(default=None, max_length=MAX_IMAGE_URL_LENGTH)
    sort_order: int = Field(default=0, ge=0, le=MAX_SORT_ORDER)
    is_active: bool = True


class SubcategoryCreate(BaseModel):
    """Validated input for creating a subcategory under an existing category."""

    category_id: PyObjectId
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    image_url: str | None = Field(default=None, max_length=MAX_IMAGE_URL_LENGTH)
    sort_order: int = Field(default=0, ge=0, le=MAX_SORT_ORDER)
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("name")
    @classmethod
    def _reject_blank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name cannot be blank")
        return value

    @field_validator("image_url")
    @classmethod
    def _strip_image_url(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        if value is None or value == "":
            return None
        return validate_url_or_path(value, allow_relative=True)


class SubcategoryUpdate(BaseModel):
    """Partial update for a subcategory; omitted fields stay unchanged."""

    category_id: PyObjectId | None = None
    name: str | None = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    image_url: str | None = None
    sort_order: int | None = Field(default=None, ge=0, le=MAX_SORT_ORDER)
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("name")
    @classmethod
    def _reject_blank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name cannot be blank")
        return value

    @field_validator("image_url")
    @classmethod
    def _strip_image_url(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        if value is None or value == "":
            return None
        return validate_url_or_path(value, allow_relative=True)


class SubcategoryRead(BaseModel):
    """Subcategory as exposed over the API."""

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    category_id: PyObjectId
    name: str
    slug: str
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool = True
