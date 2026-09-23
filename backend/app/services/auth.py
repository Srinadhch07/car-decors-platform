"""Authentication service layer (login, sessions, and account management)."""

from datetime import timedelta

from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import get_settings
from app.core.security import (
    generate_reset_token,
    hash_password,
    hash_reset_token,
    spend_time_for_unknown_email,
    verify_password,
)
from app.models.admin_user import AdminUser
from app.models.base import utc_now
from app.repositories.admin_users import AdminUserRepository


class AccountError(Exception):
    """Base error for account-management failures."""


class InvalidCurrentPassword(AccountError):
    """The supplied current password does not match the stored hash."""


class NewEmailUnavailable(AccountError):
    """The requested email already belongs to another account."""


class NewEmailUnchanged(AccountError):
    """The requested email equals the current one."""


class NewPasswordUnchanged(AccountError):
    """The requested password equals the current one."""


class InvalidOrExpiredResetToken(AccountError):
    """The reset token is missing, reused, expired, or otherwise invalid."""


async def authenticate_admin(
    database: AsyncDatabase, *, email: str, password: str
) -> AdminUser | None:
    """Return the admin on valid credentials, else ``None``.

    Unknown emails and wrong passwords follow the same code path with the same
    response shape, and unknown emails spend a comparable verification time to
    avoid user-enumeration via timing.
    """
    repository = AdminUserRepository(database)
    admin = await repository.get_by_email(email)
    if admin is None:
        spend_time_for_unknown_email()
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


async def change_admin_email(
    database: AsyncDatabase, *, admin: AdminUser, new_email: str, current_password: str
) -> None:
    """Change the admin's login email after verifying the current password.

    Bumps ``token_version`` so every existing session is invalidated; the
    caller should clear the session cookies and require a fresh login.
    """
    if not verify_password(current_password, admin.password_hash):
        raise InvalidCurrentPassword()
    repository = AdminUserRepository(database)
    if new_email == admin.email:
        raise NewEmailUnchanged()
    existing = await repository.get_by_email(new_email)
    if existing is not None and existing.id != admin.id:
        raise NewEmailUnavailable()
    await repository.update(
        admin.id,
        {
            "email": new_email,
            "token_version": admin.token_version + 1,
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
        },
    )


async def change_admin_password(
    database: AsyncDatabase, *, admin: AdminUser, current_password: str, new_password: str
) -> None:
    """Replace the admin's password after verifying the current one.

    The new password is hashed with Argon2id and never stored or logged in
    plaintext. ``token_version`` is bumped so other sessions are revoked.
    """
    if not verify_password(current_password, admin.password_hash):
        raise InvalidCurrentPassword()
    if new_password == current_password:
        raise NewPasswordUnchanged()
    repository = AdminUserRepository(database)
    await repository.update(
        admin.id,
        {
            "password_hash": hash_password(new_password),
            "token_version": admin.token_version + 1,
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
        },
    )


async def issue_password_reset(
    database: AsyncDatabase, *, admin: AdminUser, email_service: object
) -> None:
    """Create a single-use reset token, email it, and persist only on success.

    The raw token is sent only by email; MongoDB stores its SHA-256 hash, so a
    persisted token is never usable as a reset credential. If SMTP delivery
    fails the token is never saved, leaving no stale valid link behind.
    """
    settings = get_settings()
    raw_token = generate_reset_token()
    email_service.send_password_reset_email(
        to_email=admin.email,
        token=raw_token,
        frontend_url=settings.frontend_url,
        expires_minutes=settings.password_reset_token_minutes,
    )
    now = utc_now()
    await AdminUserRepository(database).update(
        admin.id,
        {
            "password_reset_token_hash": hash_reset_token(raw_token),
            "password_reset_expires_at": now
            + timedelta(minutes=settings.password_reset_token_minutes),
        },
    )


async def apply_password_reset(database: AsyncDatabase, *, token: str, new_password: str) -> bool:
    """Apply a new password for a valid, unexpired, single-use reset token."""
    admin = await AdminUserRepository(database).find_by_password_reset_token_hash(
        hash_reset_token(token)
    )
    if admin is None:
        return False
    expires_at = admin.password_reset_expires_at
    if expires_at is None or expires_at < utc_now():
        return False
    await AdminUserRepository(database).update(
        admin.id,
        {
            "password_hash": hash_password(new_password),
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
            "token_version": admin.token_version + 1,
        },
    )
    return True
