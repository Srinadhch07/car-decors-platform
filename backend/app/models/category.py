"""Category document, schemas, and public read model."""

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import validate_url_or_path
from app.models.base import SLUG_PATTERN, BaseDocument, PyObjectId

MAX_NAME_LENGTH = 120
MAX_DESCRIPTION_LENGTH = 400
MAX_IMAGE_URL_LENGTH = 500
MAX_SORT_ORDER = 10000


class Category(BaseDocument):
    """A top-level product category, created dynamically by the owner."""

    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str = Field(pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    image_url: str | None = Field(default=None, max_length=MAX_IMAGE_URL_LENGTH)
    sort_order: int = Field(default=0, ge=0, le=MAX_SORT_ORDER)
    is_active: bool = True


class CategoryCreate(BaseModel):
    """Validated input for creating a category.

    When ``slug`` is omitted it is generated from ``name`` by the service layer
    and made unique deterministically.
    """

    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
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

    @field_validator("description", "image_url")
    @classmethod
    def _strip_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("image_url")
    @classmethod
    def _validate_image_url(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        if value is None or value == "":
            return None
        return validate_url_or_path(value, allow_relative=True)


class CategoryUpdate(BaseModel):
    """Partial update for a category; omitted fields stay unchanged."""

    name: str | None = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=MAX_NAME_LENGTH)
    description: str | None = None
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

    @field_validator("description", "image_url")
    @classmethod
    def _strip_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("image_url")
    @classmethod
    def _validate_image_url(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        if value is None or value == "":
            return None
        return validate_url_or_path(value, allow_relative=True)


class CategoryRead(BaseModel):
    """Category as exposed over the API."""

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool = True
