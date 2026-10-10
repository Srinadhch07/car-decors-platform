"""Testimonial document and request/response schemas.

New customer submissions are never public: they always start as ``pending``,
unpublished, and not featured. Approval alone does not publish a testimonial;
publication and featuring are separate, admin-controlled flags.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.base import BaseDocument, PyObjectId
from app.models.enums import TestimonialStatus

#: Bounded testimonial text limits (documented contract).
MAX_CUSTOMER_NAME_LENGTH = 120
MAX_TESTIMONIAL_LENGTH = 1000
MAX_MODERATION_NOTE_LENGTH = 500
RATING_MIN = 1
RATING_MAX = 5

#: Honeypot field bound; a hidden field real customers never fill.
MAX_HONEYPOT_LENGTH = 100


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


class Testimonial(BaseDocument):
    """A customer testimonial as persisted in MongoDB."""

    customer_name: str = Field(min_length=1, max_length=MAX_CUSTOMER_NAME_LENGTH)
    text: str = Field(min_length=1, max_length=MAX_TESTIMONIAL_LENGTH)
    rating: int | None = Field(default=None, ge=RATING_MIN, le=RATING_MAX)
    status: TestimonialStatus = TestimonialStatus.PENDING
    published: bool = False
    is_featured: bool = False
    consent: bool = False
    moderation_note: str | None = Field(
        default=None, max_length=MAX_MODERATION_NOTE_LENGTH
    )

    @field_validator("customer_name", mode="before")
    @classmethod
    def _strip_customer_name_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("customer_name")
    @classmethod
    def _validate_customer_name(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("text", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("moderation_note", mode="before")
    @classmethod
    def _strip_note_before(cls, value: object) -> object:
        if value is None:
            return None
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("moderation_note")
    @classmethod
    def _validate_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _reject_control_characters(value)
        return _require_non_blank(value) if value else None


class TestimonialSubmission(BaseModel):
    """Public submission payload.

    ``extra="forbid"`` rejects attempts to set privileged fields such as
    ``status``, ``published``, or ``is_featured`` from a public request.
    """

    model_config = ConfigDict(extra="forbid")

    customer_name: str = Field(min_length=1, max_length=MAX_CUSTOMER_NAME_LENGTH)
    text: str = Field(min_length=1, max_length=MAX_TESTIMONIAL_LENGTH)
    rating: int | None = Field(default=None, ge=RATING_MIN, le=RATING_MAX)
    consent: bool
    #: Honeypot for naive spam bots; must stay empty for a real submission.
    website: str | None = Field(default=None, max_length=MAX_HONEYPOT_LENGTH)

    @field_validator("customer_name", mode="before")
    @classmethod
    def _strip_customer_name_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("customer_name")
    @classmethod
    def _validate_customer_name(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("text", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str) -> str:
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("website", mode="before")
    @classmethod
    def _strip_website_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("website")
    @classmethod
    def _blank_website_to_none(cls, value: str | None) -> str | None:
        return value if value else None

    @field_validator("consent")
    @classmethod
    def _require_explicit_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError(
                "explicit consent is required for public display of your testimonial"
            )
        return value


class TestimonialUpdate(BaseModel):
    """Admin edits to a testimonial's content.

    Optional fields: an explicitly included field is applied, so ``None`` can
    clear ``rating`` or ``moderation_note``. Strings must remain non-blank.
    """

    customer_name: str | None = Field(
        default=None, min_length=1, max_length=MAX_CUSTOMER_NAME_LENGTH
    )
    text: str | None = Field(default=None, min_length=1, max_length=MAX_TESTIMONIAL_LENGTH)
    rating: int | None = Field(default=None, ge=RATING_MIN, le=RATING_MAX)
    moderation_note: str | None = Field(
        default=None, max_length=MAX_MODERATION_NOTE_LENGTH
    )

    @field_validator("customer_name", mode="before")
    @classmethod
    def _strip_customer_name_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("customer_name")
    @classmethod
    def _validate_customer_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("text", mode="before")
    @classmethod
    def _strip_text_before(cls, value: object) -> object:
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _reject_control_characters(value)
        return _require_non_blank(value)

    @field_validator("moderation_note", mode="before")
    @classmethod
    def _strip_note_before(cls, value: object) -> object:
        if value is None:
            return None
        return _clean_text(value) if isinstance(value, str) else value

    @field_validator("moderation_note")
    @classmethod
    def _validate_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _reject_control_characters(value)
        return _require_non_blank(value) if value else None


class TestimonialRead(BaseModel):
    """A testimonial as exposed to the public.

    Built only from documents already verified as approved, published, and
    consented, so moderation/private fields are never part of this schema.
    """

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    customer_name: str
    text: str
    rating: int | None = None
    created_at: datetime


class TestimonialListPage(BaseModel):
    """Bounded, paginated public testimonial listing."""

    items: list[TestimonialRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class TestimonialAdminRead(BaseModel):
    """Full admin view including moderation state and private note."""

    model_config = ConfigDict(from_attributes=True)

    id: PyObjectId
    customer_name: str
    text: str
    rating: int | None = None
    status: TestimonialStatus
    published: bool
    is_featured: bool
    consent: bool
    moderation_note: str | None = None
    created_at: datetime
    updated_at: datetime


class TestimonialAdminListPage(BaseModel):
    """Paginated admin listing whose items carry moderation state."""

    items: list[TestimonialAdminRead]
    page: int
    page_size: int
    total: int
    total_pages: int


class TestimonialStatusRequest(BaseModel):
    """Body for the admin approve/reject endpoint."""

    status: TestimonialStatus


class TestimonialPublicationRequest(BaseModel):
    """Body for the admin publish/unpublish endpoint."""

    published: bool


class TestimonialFeaturedRequest(BaseModel):
    """Body for the admin feature/unfeature endpoint."""

    is_featured: bool


__all__ = [
    "MAX_CUSTOMER_NAME_LENGTH",
    "MAX_TESTIMONIAL_LENGTH",
    "MAX_MODERATION_NOTE_LENGTH",
    "RATING_MIN",
    "RATING_MAX",
    "Testimonial",
    "TestimonialAdminListPage",
    "TestimonialAdminRead",
    "TestimonialFeaturedRequest",
    "TestimonialListPage",
    "TestimonialPublicationRequest",
    "TestimonialRead",
    "TestimonialStatusRequest",
    "TestimonialSubmission",
    "TestimonialUpdate",
]