"""Request schemas for admin authentication and account management."""

from pydantic import BaseModel, EmailStr, Field, field_validator

#: Shared password policy enforced equally by the backend (authoritative) and
#: the frontend (feedback only). The login schema keeps its looser bounds so an
#: existing account whose password predates this policy can still sign in.
PASSWORD_MIN_LENGTH = 10
PASSWORD_MAX_LENGTH = 200


def _normalize_email(value: str) -> str:
    return value.strip().lower()


class LoginRequest(BaseModel):
    """Credentials for the single admin account."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class ChangeEmailRequest(BaseModel):
    """Authenticated email change; requires the current password."""

    new_email: EmailStr
    current_password: str = Field(min_length=1, max_length=200)

    @field_validator("new_email")
    @classmethod
    def _normalize_new_email(cls, value: str) -> str:
        return _normalize_email(value)


class ChangePasswordRequest(BaseModel):
    """Authenticated password change; requires the current password."""

    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    confirm_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class ForgotPasswordRequest(BaseModel):
    """Email used to request a password-reset link."""

    email: EmailStr

    @field_validator("email")
    @classmethod
    def _normalize_email_address(cls, value: str) -> str:
        return _normalize_email(value)


class ResetPasswordRequest(BaseModel):
    """Opaque one-time token plus the new password."""

    token: str = Field(min_length=8, max_length=256)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    confirm_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
