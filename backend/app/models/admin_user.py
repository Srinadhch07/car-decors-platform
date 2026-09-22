"""Admin user document and schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.base import BaseDocument, PyObjectId


class AdminUser(BaseDocument):
    """A single shop-owner admin account."""

    email: EmailStr
    password_hash: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AdminUserRead(BaseModel):
    """Public representation of an admin account (never exposes the hash)."""

    id: PyObjectId
    email: EmailStr
