"""Shop settings document, public read schema, and admin update schema."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import validate_url_or_path
from app.models.base import BaseDocument

#: Social networks the shop may link to; keeps entries predictable and simple.
SOCIAL_LINK_KEYS = frozenset(
    {"instagram", "facebook", "twitter", "youtube", "linkedin", "telegram", "whatsapp", "website"}
)

_MAX_CONTACT_LENGTH = 40
_MAX_FREE_TEXT_LENGTH = 500
_MAX_LINK_LENGTH = 500


class ShopSettings(BaseDocument):
    """Business information for the (single) shop."""

    shop_name: str = Field(min_length=1, max_length=200)
    whatsapp_number: str = ""
    phone: str = ""
    email: EmailStr | None = None
    address: str = ""
    business_hours: str | None = None
    social_links: dict[str, str] = Field(default_factory=dict)
    logo_url: str | None = None


class ShopSettingsPublic(BaseModel):
    """Safe public representation; intentionally omits ids and timestamps."""

    model_config = ConfigDict(from_attributes=True)

    shop_name: str
    whatsapp_number: str = ""
    phone: str = ""
    email: EmailStr | None = None
    address: str = ""
    business_hours: str | None = None
    social_links: dict[str, str] = Field(default_factory=dict)
    logo_url: str | None = None


def _validate_url_value(value: str, *, allow_relative: bool) -> str:
    return validate_url_or_path(value, allow_relative=allow_relative)


class ShopSettingsUpdate(BaseModel):
    """Fields the shop owner may edit.

    ``None`` means the field was not sent in this request; sending an explicit
    ``null`` clears an optional value. Field names are the only accepted input,
    so arbitrary MongoDB operators or unknown keys can never reach the database.
    """

    shop_name: str | None = Field(default=None, min_length=1, max_length=200)
    whatsapp_number: str | None = Field(default=None, max_length=_MAX_CONTACT_LENGTH)
    phone: str | None = Field(default=None, max_length=_MAX_CONTACT_LENGTH)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=_MAX_FREE_TEXT_LENGTH)
    business_hours: str | None = Field(default=None, max_length=_MAX_FREE_TEXT_LENGTH)
    social_links: dict[str, str] | None = None
    logo_url: str | None = Field(default=None, max_length=_MAX_LINK_LENGTH)

    @field_validator("shop_name", mode="before")
    @classmethod
    def _strip_shop_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("shop_name")
    @classmethod
    def _reject_blank_shop_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("shop_name cannot be blank")
        return value

    @field_validator("whatsapp_number", "phone")
    @classmethod
    def _normalize_contact(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        if any(ord(char) < 32 for char in normalized):
            raise ValueError("contains control characters")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("address", "business_hours")
    @classmethod
    def _strip_free_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("social_links")
    @classmethod
    def _validate_social_links(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        if value is None:
            return value
        unknown = set(value) - SOCIAL_LINK_KEYS
        if unknown:
            joined = ", ".join(sorted(unknown))
            raise ValueError(f"unsupported social link keys: {joined}")
        cleaned: dict[str, str] = {}
        for platform, url in value.items():
            cleaned[platform] = _validate_url_value(url, allow_relative=False)
        return cleaned

    @field_validator("logo_url")
    @classmethod
    def _validate_logo_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_url_value(value, allow_relative=True)
