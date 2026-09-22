"""Request schemas for admin authentication."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials for the single admin account."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
