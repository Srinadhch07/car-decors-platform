"""Tests for admin authentication: login, sessions, CSRF, and rate limiting."""

from datetime import UTC, datetime, timedelta

import jwt
from httpx import AsyncClient

from app.core.config import get_settings
from app.core.security import create_access_token, get_jwt_secret, hash_password
from app.seed import seed_admin_user
from tests.support.mongomock_async import AsyncDatabase

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "correct-horse-battery"
LOGIN_URL = "/api/admin/auth/login"
ME_URL = "/api/admin/auth/me"
LOGOUT_URL = "/api/admin/auth/logout"


async def _login(
    client: AsyncClient,
    *,
    email: str = ADMIN_EMAIL,
    password: str = ADMIN_PASSWORD,
):
    return await client.post(LOGIN_URL, json={"email": email, "password": password})


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    settings = get_settings()
    value = client.cookies.get(settings.csrf_cookie_name) or ""
    return {"X-CSRF-Token": value}


async def test_login_with_valid_credentials_returns_public_profile(
    auth_client: AsyncClient, seeded_admin
) -> None:
    response = await _login(auth_client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(seeded_admin.id)
    assert payload["email"] == ADMIN_EMAIL
    assert set(payload) == {"id", "email"}


async def test_login_response_never_exposes_password_material(
    auth_client: AsyncClient, seeded_admin
) -> None:
    response = await _login(auth_client)

    assert response.status_code == 200
    body = response.text.lower()
    assert "password" not in body
    assert "$argon2" not in body


async def test_login_rejects_wrong_password(auth_client: AsyncClient, seeded_admin) -> None:
    response = await _login(auth_client, password="not-the-password")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


async def test_login_unknown_email_matches_wrong_password_response(
    auth_client: AsyncClient, seeded_admin
) -> None:
    unknown = await _login(auth_client, email="ghost@example.com", password="whatever")
    wrong_pw = await _login(auth_client, password="not-the-password")

    assert unknown.status_code == 401
    assert unknown.text == wrong_pw.text


async def test_login_sets_http_only_session_cookie(auth_client: AsyncClient, seeded_admin) -> None:
    response = await _login(auth_client)

    assert response.status_code == 200
    settings = get_settings()
    cookie = auth_client.cookies.get(settings.cookie_name)
    assert cookie is not None and cookie != ""


async def test_session_cookie_security_attributes(auth_client: AsyncClient, seeded_admin) -> None:
    response = await _login(auth_client)
    set_cookie_headers = response.headers.get_list("set-cookie")

    assert set_cookie_headers, "expected Set-Cookie headers"
    settings = get_settings()
    session_header = next(
        header for header in set_cookie_headers if header.startswith(settings.cookie_name + "=")
    )
    assert "HttpOnly" in session_header
    assert "SameSite=lax" in session_header
    assert "Path=/" in session_header
    assert "Max-Age=" in session_header
    assert "Secure" not in session_header


async def test_session_cookie_is_not_http_only_for_csrf_token(
    auth_client: AsyncClient, seeded_admin
) -> None:
    response = await _login(auth_client)
    set_cookie_headers = response.headers.get_list("set-cookie")
    settings = get_settings()

    csrf_header = next(
        header
        for header in set_cookie_headers
        if header.startswith(settings.csrf_cookie_name + "=")
    )
    assert "HttpOnly" not in csrf_header


async def test_me_requires_authentication(auth_client: AsyncClient, fake_db) -> None:
    response = await auth_client.get(ME_URL)

    assert response.status_code == 401


async def test_me_returns_current_admin(auth_client: AsyncClient, seeded_admin) -> None:
    await _login(auth_client)

    response = await auth_client.get(ME_URL)

    assert response.status_code == 200
    assert response.json() == {"id": str(seeded_admin.id), "email": ADMIN_EMAIL}


async def test_me_rejects_expired_token(auth_client: AsyncClient, seeded_admin) -> None:
    now = datetime.now(UTC)
    expired = jwt.encode(
        {
            "sub": str(seeded_admin.id),
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        get_jwt_secret(),
        algorithm="HS256",
    )
    auth_client.cookies.set(get_settings().cookie_name, expired, domain="testserver")

    response = await auth_client.get(ME_URL)

    assert response.status_code == 401


async def test_me_rejects_tampered_token(auth_client: AsyncClient, seeded_admin) -> None:
    auth_client.cookies.set(
        get_settings().cookie_name,
        "not-a-valid-jwt-at-all",
        domain="testserver",
    )

    response = await auth_client.get(ME_URL)

    assert response.status_code == 401


async def test_me_rejects_token_for_missing_admin(
    auth_client: AsyncClient, fake_db: AsyncDatabase
) -> None:
    forgery = create_access_token("507f1f77bcf86cd799439011")
    auth_client.cookies.set(get_settings().cookie_name, forgery, domain="testserver")

    response = await auth_client.get(ME_URL)

    assert response.status_code == 401


async def test_me_rejects_token_with_non_objectid_subject(auth_client: AsyncClient) -> None:
    forgery = create_access_token("not-an-object-id")
    auth_client.cookies.set(get_settings().cookie_name, forgery, domain="testserver")

    response = await auth_client.get(ME_URL)

    assert response.status_code == 401


async def test_protected_logout_requires_authentication(auth_client: AsyncClient) -> None:
    response = await auth_client.post(LOGOUT_URL)

    assert response.status_code == 401


async def test_logout_requires_valid_csrf_token(auth_client: AsyncClient, seeded_admin) -> None:
    await _login(auth_client)

    with_cookie = await auth_client.post(LOGOUT_URL, headers={"X-CSRF-Token": "totally-wrong"})
    assert with_cookie.status_code == 403

    without = await auth_client.post(LOGOUT_URL)
    assert without.status_code == 403


async def test_authenticated_logout_clears_session(auth_client: AsyncClient, seeded_admin) -> None:
    await _login(auth_client)
    settings = get_settings()
    assert auth_client.cookies.get(settings.cookie_name) is not None

    response = await auth_client.post(LOGOUT_URL, headers=_csrf_header(auth_client))

    assert response.status_code == 204
    assert auth_client.cookies.get(settings.cookie_name) is None
    assert (await auth_client.get(ME_URL)).status_code == 401


async def test_login_attempts_are_rate_limited(auth_client: AsyncClient, seeded_admin) -> None:
    for _ in range(5):
        assert (await _login(auth_client, password="wrong-password")).status_code == 401

    blocked = await _login(auth_client, password=ADMIN_PASSWORD)

    assert blocked.status_code == 429
    assert blocked.headers.get("retry-after") is not None
    assert auth_client.cookies.get(get_settings().cookie_name) is None


async def test_successful_login_resets_rate_limit(auth_client: AsyncClient, seeded_admin) -> None:
    for _ in range(4):
        await _login(auth_client, password="wrong-password")

    assert (await _login(auth_client)).status_code == 200

    for _ in range(5):
        assert (await _login(auth_client, password="wrong-password")).status_code == 401


async def test_malformed_email_is_rejected_without_auth_leak(
    auth_client: AsyncClient, seeded_admin
) -> None:
    response = await auth_client.post(
        LOGIN_URL, json={"email": "not-an-email", "password": ADMIN_PASSWORD}
    )

    assert response.status_code == 422
    assert response.json().get("detail", [{}])[0].get("type") == "value_error"


async def test_seeded_admin_can_authenticate(
    auth_client: AsyncClient, fake_db: AsyncDatabase
) -> None:
    await seed_admin_user(fake_db, email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD))

    response = await _login(auth_client)

    assert response.status_code == 200
    assert response.json()["email"] == ADMIN_EMAIL
    assert (await auth_client.get(ME_URL)).status_code == 200
