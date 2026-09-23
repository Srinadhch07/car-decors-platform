"""Shared FastAPI dependencies for protected admin endpoints."""

from typing import Annotated

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.security import (
    TokenError,
    decode_access_token,
    decode_token_version,
    tokens_match,
)
from app.db.dependencies import DatabaseDep
from app.models.admin_user import AdminUser
from app.repositories.admin_users import AdminUserRepository


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(request: Request, database: DatabaseDep) -> AdminUser:
    """Resolve the authenticated admin from the session cookie.

    Reusable guard for every admin-only endpoint (B4-B7 and beyond).
    """
    settings = get_settings()
    token = request.cookies.get(settings.cookie_name)
    if not token:
        raise _unauthorized()
    try:
        admin_id = ObjectId(decode_access_token(token))
        token_version = decode_token_version(token)
    except (TokenError, ValueError):
        raise _unauthorized() from None
    admin = await AdminUserRepository(database).get_by_id(admin_id)
    if admin is None:
        raise _unauthorized()
    if token_version != admin.token_version:
        raise _unauthorized()
    request.state.admin = admin
    return admin


AdminDep = Annotated[AdminUser, Depends(require_admin)]


async def verify_csrf(request: Request) -> None:
    """Reject state-changing requests that lack a valid CSRF token.

    Double-submit pattern: the browser echoes the readable ``car_decor_csrf``
    cookie back in the ``X-CSRF-Token`` header.
    """
    settings = get_settings()
    cookie = request.cookies.get(settings.csrf_cookie_name)
    header = request.headers.get("x-csrf-token")
    if not tokens_match(header=header, cookie=cookie):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing or invalid",
        )


CsrfDep = Annotated[None, Depends(verify_csrf)]
