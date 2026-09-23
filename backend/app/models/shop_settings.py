"""Shop settings document, public read schema, and admin update schema."""

import re

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

#: Strict 6-digit hex so user-supplied colors can never smuggle arbitrary CSS
#: (``url(...)``, ``javascript:``, expressions, selectors) into the website.
_HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
_PRESET_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

#: The default website theme (a.k.a. the "Automotive Orange" preset). These
#: values intentionally mirror the original static palette so the shop looks
#: identical until an admin explicitly saves a new theme.
DEFAULT_THEME_VALUES = {
    "preset": "automotive-orange",
    "primary": "#F97316",  # brand orange (was --color-orange-500)
    "secondary": "#111111",  # dark surfaces (was --color-dark-900)
    "accent": "#FFFFFF",  # contrast text on brand/dark surfaces
    "background": "#FFFFFF",  # main page background (was --color-surface)
    "foreground": "#1A1A1A",  # body text (was --color-text-primary)
    "muted": "#525252",  # secondary text (was --color-text-secondary)
    "border": "#D4D4D4",  # dividers (was --color-border)
}


class Theme(BaseModel):
    """Website color/theme values managed through Shop Settings.

    Colors are validated as strict 6-digit hex, so only safe color strings can
    ever reach the public website.
    """

    preset: str = DEFAULT_THEME_VALUES["preset"]
    primary: str = DEFAULT_THEME_VALUES["primary"]
    secondary: str = DEFAULT_THEME_VALUES["secondary"]
    accent: str = DEFAULT_THEME_VALUES["accent"]
    background: str = DEFAULT_THEME_VALUES["background"]
    foreground: str = DEFAULT_THEME_VALUES["foreground"]
    muted: str = DEFAULT_THEME_VALUES["muted"]
    border: str = DEFAULT_THEME_VALUES["border"]

    @field_validator("preset")
    @classmethod
    def _validate_preset(cls, value: str) -> str:
        normalized = value.strip()
        if not _PRESET_PATTERN.fullmatch(normalized) or len(normalized) > 50:
            raise ValueError("preset must be a lowercase slug like automotive-orange")
        return normalized

    @field_validator(
        "primary",
        "secondary",
        "accent",
        "background",
        "foreground",
        "muted",
        "border",
    )
    @classmethod
    def _validate_hex_color(cls, value: str) -> str:
        if not _HEX_COLOR_PATTERN.fullmatch(value):
            raise ValueError("must be a 6-digit hex color like #Ea580c")
        return value.upper()


def default_theme() -> Theme:
    """Return a fresh copy of the default website theme."""
    return Theme()


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
    theme: Theme = Field(default_factory=default_theme)


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
    theme: Theme = Field(default_factory=default_theme)


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
    theme: Theme | None = None

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
