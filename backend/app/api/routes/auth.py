"""Admin authentication and account-management endpoints."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import AdminDep, CsrfDep
from app.core.config import get_settings
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import create_access_token, generate_csrf_token
from app.db.dependencies import DatabaseDep
from app.models.admin_user import AdminUserRead
from app.models.auth import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
)
from app.repositories.admin_users import AdminUserRepository
from app.services import auth as auth_service
from app.services.auth import authenticate_admin
from app.services.email import EmailError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/auth", tags=["auth"])

#: Small fixed delay on the "unknown email" forgot-password path so its
#: response latency approximates the SMTP round-trip of the known path,
#: reducing a timing-based account-enumeration signal.
_FORGOT_PASSWORD_TIMING_PAD_SECONDS = 0.4

FORGOT_PASSWORD_RESPONSE = {
    "message": "If an account exists for that email, a password reset link has been sent."
}


def _client_ip(request: Request) -> str:
    """Identify an attempt source for rate limiting.

    Uses the direct peer address; operators behind a trusting reverse proxy can
    extend this to honor ``X-Forwarded-For`` via ``TRUSTED_PROXY``. A forged
    header must never be trusted - so we do not read it here by default.
    """
    if request.client is None:
        return "unknown"
    return request.client.host


def _clear_auth_cookies(response: Response) -> Response:
    """Expire the session and CSRF cookies in the response."""
    settings = get_settings()
    kwargs = {
        "path": "/",
        "domain": settings.cookie_domain or None,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
    }
    response.delete_cookie(settings.cookie_name, httponly=True, **kwargs)
    response.delete_cookie(settings.csrf_cookie_name, **kwargs)
    return response


@router.post("/login", response_model=AdminUserRead)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    database: DatabaseDep,
) -> AdminUserRead:
    """Authenticate the admin and establish a session via httpOnly cookies."""
    settings = get_settings()
    limiter: SlidingWindowLimiter = request.app.state.login_limiter

    client_key = _client_ip(request)
    if not limiter.allow(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(limiter.retry_after_seconds(client_key))},
        )

    admin = await authenticate_admin(database, email=payload.email, password=payload.password)
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    limiter.reset(client_key)

    session_token = create_access_token(str(admin.id), version=admin.token_version)
    csrf_token = generate_csrf_token()
    max_age = settings.jwt_access_minutes * 60
    response.set_cookie(
        settings.cookie_name,
        session_token,
        max_age=max_age,
        path="/",
        domain=settings.cookie_domain or None,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        path="/",
        domain=settings.cookie_domain or None,
        secure=settings.cookie_secure,
        httponly=False,
        samesite=settings.cookie_samesite,
    )
    return AdminUserRead(id=admin.id, email=admin.email)


@router.get("/me", response_model=AdminUserRead)
async def me(admin: AdminDep) -> AdminUserRead:
    """Return the credentials of the current authenticated admin."""
    return AdminUserRead(id=admin.id, email=admin.email)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    _admin: AdminDep,
    _csrf: CsrfDep,
) -> Response:
    """Invalidate the session by clearing both auth cookies."""
    return _clear_auth_cookies(Response(status_code=status.HTTP_204_NO_CONTENT))


@router.post("/change-email", status_code=status.HTTP_204_NO_CONTENT)
async def change_email(
    payload: ChangeEmailRequest,
    admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> Response:
    """Change the login email (current password required); revokes the session."""
    try:
        await auth_service.change_admin_email(
            database,
            admin=admin,
            new_email=payload.new_email,
            current_password=payload.current_password,
        )
    except auth_service.InvalidCurrentPassword as exc:
        raise HTTPException(status_code=400, detail="Current password is incorrect.") from exc
    except auth_service.NewEmailUnchanged as exc:
        raise HTTPException(
            status_code=400, detail="New email must be different from the current email."
        ) from exc
    except auth_service.NewEmailUnavailable as exc:
        raise HTTPException(status_code=409, detail="That email is already in use.") from exc
    # Bumping token_version invalidated this session: clear cookies and force a
    # fresh login with the new email.
    return _clear_auth_cookies(Response(status_code=status.HTTP_204_NO_CONTENT))


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> Response:
    """Change the password (current password required); revokes the session."""
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    try:
        await auth_service.change_admin_password(
            database,
            admin=admin,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except auth_service.InvalidCurrentPassword as exc:
        raise HTTPException(status_code=400, detail="Current password is incorrect.") from exc
    except auth_service.NewPasswordUnchanged as exc:
        raise HTTPException(
            status_code=400, detail="New password must be different from the current password."
        ) from exc
    return _clear_auth_cookies(Response(status_code=status.HTTP_204_NO_CONTENT))


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    database: DatabaseDep,
) -> dict:
    """Request a password-reset link; never reveals whether the email exists.

    Public endpoint (no session, no CSRF — consistent with login). The response
    is identical for known and unknown accounts, and both paths are rate-limited
    equally per client IP.
    """
    limiter: SlidingWindowLimiter = request.app.state.forgot_password_limiter
    client_key = _client_ip(request)
    if not limiter.allow(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Try again later.",
            headers={"Retry-After": str(limiter.retry_after_seconds(client_key))},
        )

    admin = await AdminUserRepository(database).get_by_email(payload.email)
    if admin is not None:
        try:
            await auth_service.issue_password_reset(
                database, admin=admin, email_service=request.app.state.email_service
            )
        except EmailError:
            # Delivery failed: keep the generic response, never persist the token.
            pass
    else:
        # Comparable latency for unknown vs known accounts (see module docstring).
        await asyncio.sleep(_FORGOT_PASSWORD_TIMING_PAD_SECONDS)

    return FORGOT_PASSWORD_RESPONSE


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    database: DatabaseDep,
) -> Response:
    """Redeem a one-time reset token and set a new password.

    Public endpoint (no session, no CSRF). Invalid, expired, already-used, and
    unknown tokens all produce the same generic error.
    """
    limiter: SlidingWindowLimiter = request.app.state.reset_password_limiter
    client_key = _client_ip(request)
    if not limiter.allow(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later.",
            headers={"Retry-After": str(limiter.retry_after_seconds(client_key))},
        )
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    applied = await auth_service.apply_password_reset(
        database, token=payload.token, new_password=payload.new_password
    )
    if not applied:
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired.")
    return _clear_auth_cookies(Response(status_code=status.HTTP_204_NO_CONTENT))
