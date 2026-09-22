"""Admin authentication endpoints: login, logout, and current session."""

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import AdminDep, CsrfDep
from app.core.config import get_settings
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import create_access_token, generate_csrf_token
from app.db.dependencies import DatabaseDep
from app.models.admin_user import AdminUserRead
from app.models.auth import LoginRequest
from app.services.auth import authenticate_admin

router = APIRouter(prefix="/admin/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    """Identify the login attempt source for rate limiting.

    Uses the direct peer address; operators behind a trusting reverse proxy can
    extend this to honor ``X-Forwarded-For`` via ``TRUSTED_PROXY``. A forged
    header must never be trusted - so we do not read it here by default.
    """
    if request.client is None:
        return "unknown"
    return request.client.host


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

    session_token = create_access_token(str(admin.id))
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
    settings = get_settings()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    base_kwargs = {
        "path": "/",
        "domain": settings.cookie_domain or None,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
    }
    response.delete_cookie(settings.cookie_name, httponly=True, **base_kwargs)
    response.delete_cookie(settings.csrf_cookie_name, **base_kwargs)
    return response
