"""Admin user document and schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.base import BaseDocument, PyObjectId


class AdminUser(BaseDocument):
    """A single shop-owner admin account."""

    email: EmailStr
    password_hash: str = Field(min_length=1)
    # SHA-256 hash of the raw single-use password-reset token (never the token).
    password_reset_token_hash: str | None = None
    password_reset_expires_at: datetime | None = None
    # Bumped on password/email changes so previously issued JWTs are revoked.
    token_version: int = Field(default=0, ge=0)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AdminUserRead(BaseModel):
    """Public representation of an admin account (never exposes the hash)."""

    id: PyObjectId
    email: EmailStr
