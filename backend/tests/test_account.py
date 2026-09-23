"""Tests for admin account management: email/password changes and reset flow."""

from datetime import timedelta

import pytest
from httpx import AsyncClient

import app.api.routes.auth as auth_router
from app.core.config import get_settings
from app.core.security import hash_password, hash_reset_token, verify_password
from app.models.base import utc_now
from app.repositories.admin_users import AdminUserRepository
from app.seed import seed_admin_user
from tests.support.mongomock_async import AsyncDatabase
from tests.support.recording_email import RecordingEmailService

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "correct-horse-battery"
NEW_ADMIN_EMAIL = "new.admin@example.com"
NEW_PASSWORD = "new-secure-password-1"
LOGIN_URL = "/api/admin/auth/login"
ME_URL = "/api/admin/auth/me"
CHANGE_EMAIL_URL = "/api/admin/auth/change-email"
CHANGE_PASSWORD_URL = "/api/admin/auth/change-password"
FORGOT_PASSWORD_URL = "/api/admin/auth/forgot-password"
RESET_PASSWORD_URL = "/api/admin/auth/reset-password"


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    settings = get_settings()
    value = client.cookies.get(settings.csrf_cookie_name) or ""
    return {"X-CSRF-Token": value}


async def _login(
    client: AsyncClient,
    *,
    email: str = ADMIN_EMAIL,
    password: str = ADMIN_PASSWORD,
):
    return await client.post(LOGIN_URL, json={"email": email, "password": password})


async def _create_second_admin(fake_db: AsyncDatabase) -> None:
    await seed_admin_user(
        fake_db,
        email="another@example.com",
        password_hash=hash_password("another-password-1"),
    )


def _auth_tuple(client: AsyncClient, recorder: RecordingEmailService):
    return client, recorder


async def _issue_and_reset(client: AsyncClient, fake_db: AsyncDatabase) -> None:
    """Request a reset link and confirm a token hash is stored in the DB."""
    response = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})
    assert response.status_code == 200
    admin = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
    assert admin is not None and admin.password_reset_token_hash is not None


@pytest.fixture(autouse=True)
def _no_timing_pad(monkeypatch) -> None:
    """Remove the anti-enumeration latency pad so tests stay fast."""
    monkeypatch.setattr(auth_router, "_FORGOT_PASSWORD_TIMING_PAD_SECONDS", 0)


class TestCurrentAccount:
    async def test_me_returns_current_admin(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.get(ME_URL)

        assert response.status_code == 200
        assert response.json() == {"id": str(seeded_admin.id), "email": ADMIN_EMAIL}
        assert "$argon2" not in response.text

    async def test_change_email_requires_authentication_and_csrf(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)

        no_session = await client.post(
            CHANGE_EMAIL_URL,
            json={"new_email": NEW_ADMIN_EMAIL, "current_password": ADMIN_PASSWORD},
        )
        assert no_session.status_code == 401

        assert (await _login(client)).status_code == 200
        no_csrf = await client.post(
            CHANGE_EMAIL_URL,
            json={"new_email": NEW_ADMIN_EMAIL, "current_password": ADMIN_PASSWORD},
        )
        assert no_csrf.status_code == 403


class TestChangeEmail:
    async def test_change_email_success_requires_new_login(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": NEW_ADMIN_EMAIL, "current_password": ADMIN_PASSWORD},
        )

        assert response.status_code == 204
        stored = await AdminUserRepository(fake_db).get_by_email(NEW_ADMIN_EMAIL)
        assert stored is not None and stored.email == NEW_ADMIN_EMAIL
        assert (await client.get(ME_URL)).status_code == 401

        old_login = await _login(client)
        assert old_login.status_code == 401
        assert (await _login(client, email=NEW_ADMIN_EMAIL)).status_code == 200

    async def test_change_email_wrong_current_password(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": NEW_ADMIN_EMAIL, "current_password": "wrong-password"},
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "Current password is incorrect."}

    async def test_change_email_duplicate_rejected(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        await _create_second_admin(fake_db)
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": "another@example.com", "current_password": ADMIN_PASSWORD},
        )

        assert response.status_code == 409
        assert response.json() == {"detail": "That email is already in use."}

    async def test_change_email_invalid_format_rejected(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": "not-an-email", "current_password": ADMIN_PASSWORD},
        )

        assert response.status_code == 422

    async def test_change_email_same_email_rejected(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": ADMIN_EMAIL, "current_password": ADMIN_PASSWORD},
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "New email must be different from the current email."}


class TestChangePassword:
    async def test_change_password_success_requires_new_login(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 204
        stored = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        assert stored is not None
        assert verify_password(NEW_PASSWORD, stored.password_hash)
        assert not verify_password(ADMIN_PASSWORD, stored.password_hash)
        assert (await client.get(ME_URL)).status_code == 401

        assert (await _login(client)).status_code == 401
        assert (await _login(client, password=NEW_PASSWORD)).status_code == 200

    async def test_change_password_wrong_current_password(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": "wrong-password",
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "Current password is incorrect."}

    async def test_change_password_weak_password_rejected(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": "short",
                "confirm_password": "short",
            },
        )

        assert response.status_code == 422

    async def test_change_password_mismatched_confirmation(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": NEW_PASSWORD,
                "confirm_password": "a-different-password-1",
            },
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "Passwords do not match."}

    async def test_change_password_same_password_rejected(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": ADMIN_PASSWORD,
                "confirm_password": ADMIN_PASSWORD,
            },
        )

        assert response.status_code == 400
        assert response.json() == {
            "detail": "New password must be different from the current password."
        }

    async def test_change_password_requires_csrf(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        response = await client.post(
            CHANGE_PASSWORD_URL,
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 403


class TestForgotPassword:
    async def test_forgot_password_known_email_sends_link_and_stores_hash(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)

        response = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})

        assert response.status_code == 200
        assert response.json() == {
            "message": "If an account exists for that email, a password reset link has been sent."
        }
        assert len(recorder.sent) == 1
        sent = recorder.sent[0]
        assert sent["to_email"] == ADMIN_EMAIL
        assert sent["expires_minutes"] == get_settings().password_reset_token_minutes
        assert sent["frontend_url"] == get_settings().frontend_url
        token = sent["token"]
        assert len(token) >= 32
        stored = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        assert stored is not None
        assert stored.password_reset_token_hash == hash_reset_token(token)
        assert token not in str(await fake_db["admin_users"].find_one({"email": ADMIN_EMAIL}))

    async def test_forgot_password_unknown_email_identical_response(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)

        known = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})
        unknown = await client.post(FORGOT_PASSWORD_URL, json={"email": "ghost@example.com"})

        assert known.status_code == unknown.status_code == 200
        assert known.text == unknown.text
        assert len(recorder.sent) == 1
        stored = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        assert stored is not None and stored.password_reset_token_hash is not None
        ghost = await AdminUserRepository(fake_db).get_by_email("ghost@example.com")
        assert ghost is None

    async def test_forgot_password_works_without_session(
        self, account_client, seeded_admin
    ) -> None:
        client, recorder = _auth_tuple(*account_client)

        response = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})

        assert response.status_code == 200
        assert len(recorder.sent) == 1
        assert client.cookies.get(get_settings().cookie_name) is None

    async def test_forgot_password_failure_persists_no_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)
        recorder.fail_delivery = True

        response = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})

        assert response.status_code == 200
        assert response.json() == {
            "message": "If an account exists for that email, a password reset link has been sent."
        }
        assert "smtp" not in response.text.lower()
        stored = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        assert stored is not None and stored.password_reset_token_hash is None

    async def test_forgot_password_rate_limited(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)
        settings = get_settings()

        for _ in range(settings.forgot_password_rate_limit_max):
            assert (
                await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})
            ).status_code == 200

        blocked = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})

        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") is not None


class TestResetPassword:
    async def test_reset_password_with_valid_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)
        await _issue_and_reset(client, fake_db)
        raw_token = recorder.sent[0]["token"]

        response = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": raw_token,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 204
        admin = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        assert admin is not None
        assert verify_password(NEW_PASSWORD, admin.password_hash)
        assert admin.password_reset_token_hash is None
        assert (await _login(client)).status_code == 401
        assert (await _login(client, password=NEW_PASSWORD)).status_code == 200

    async def test_reset_password_invalid_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, _ = _auth_tuple(*account_client)

        response = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": "a" * 40,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "Password reset link is invalid or expired."}

    async def test_reset_password_expired_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)
        await _issue_and_reset(client, fake_db)
        token_hash = recorder.sent[0]["token"]
        admin = await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)
        await AdminUserRepository(fake_db).update(
            admin.id,
            {
                "password_reset_expires_at": utc_now() - timedelta(minutes=1),
            },
        )

        response = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": token_hash,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 400
        assert response.json() == {"detail": "Password reset link is invalid or expired."}

    async def test_reset_password_token_reuse_rejected(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)
        await _issue_and_reset(client, fake_db)
        raw_token = recorder.sent[0]["token"]

        first = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": raw_token,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )
        assert first.status_code == 204

        second = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": raw_token,
                "new_password": "yet-another-password-1",
                "confirm_password": "yet-another-password-1",
            },
        )

        assert second.status_code == 400
        assert second.json() == {"detail": "Password reset link is invalid or expired."}

    async def test_reset_password_weak_and_mismatched_rejected(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, _ = _auth_tuple(*account_client)

        weak = await client.post(
            RESET_PASSWORD_URL,
            json={"token": "x" * 24, "new_password": "short", "confirm_password": "short"},
        )
        assert weak.status_code == 422

        mismatch = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": "x" * 24,
                "new_password": NEW_PASSWORD,
                "confirm_password": "different-password-1",
            },
        )
        assert mismatch.status_code == 400
        assert mismatch.json() == {"detail": "Passwords do not match."}

    async def test_reset_password_rate_limited(self, account_client, seeded_admin) -> None:
        client, _ = _auth_tuple(*account_client)

        for _ in range(get_settings().reset_password_rate_limit_max):
            await client.post(
                RESET_PASSWORD_URL,
                json={
                    "token": "bad" * 12,
                    "new_password": NEW_PASSWORD,
                    "confirm_password": NEW_PASSWORD,
                },
            )

        blocked = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": "bad" * 12,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") is not None


class TestSessionInvalidation:
    async def test_password_change_bumps_token_version(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200
        old_version = (await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)).token_version

        await client.post(
            CHANGE_PASSWORD_URL,
            headers=_csrf_header(client),
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        new_version = (await AdminUserRepository(fake_db).get_by_email(ADMIN_EMAIL)).token_version
        assert new_version == old_version + 1

    async def test_email_change_invalidates_previously_issued_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        """A token minted before the change is rejected by the version check."""
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200
        settings = get_settings()
        old_session = client.cookies.get(settings.cookie_name)
        assert old_session is not None

        await client.post(
            CHANGE_EMAIL_URL,
            headers=_csrf_header(client),
            json={"new_email": NEW_ADMIN_EMAIL, "current_password": ADMIN_PASSWORD},
        )

        second = AsyncClient(transport=client._transport, base_url="http://testserver")
        try:
            second.cookies.set(settings.cookie_name, old_session, domain="testserver")
            assert (await second.get(ME_URL)).status_code == 401
        finally:
            await second.aclose()

    async def test_reset_invalidates_previously_issued_token(
        self, account_client, seeded_admin, fake_db
    ) -> None:
        client, recorder = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200
        settings = get_settings()
        old_session = client.cookies.get(settings.cookie_name)
        assert old_session is not None

        await _issue_and_reset(client, fake_db)
        raw_token = recorder.sent[0]["token"]
        await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": raw_token,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        second = AsyncClient(transport=client._transport, base_url="http://testserver")
        try:
            second.cookies.set(settings.cookie_name, old_session, domain="testserver")
            assert (await second.get(ME_URL)).status_code == 401
        finally:
            await second.aclose()


class TestSecuritySurface:
    async def test_reset_responses_never_expose_password_material(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)

        forgot = await client.post(FORGOT_PASSWORD_URL, json={"email": ADMIN_EMAIL})
        assert forgot.status_code == 200
        assert "$argon2" not in forgot.text.lower()
        assert "password_hash" not in forgot.text.lower()

        bad_reset = await client.post(
            RESET_PASSWORD_URL,
            json={
                "token": "bad" * 12,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )
        assert bad_reset.status_code == 400
        assert "$argon2" not in bad_reset.text.lower()

    async def test_change_responses_never_expose_password_material(
        self, account_client, seeded_admin
    ) -> None:
        client, _ = _auth_tuple(*account_client)
        assert (await _login(client)).status_code == 200

        responses = [
            await client.post(
                CHANGE_EMAIL_URL,
                headers=_csrf_header(client),
                json={"new_email": "another@example.com", "current_password": "wrong"},
            ),
            await client.post(
                CHANGE_PASSWORD_URL,
                headers=_csrf_header(client),
                json={
                    "current_password": "wrong",
                    "new_password": NEW_PASSWORD,
                    "confirm_password": NEW_PASSWORD,
                },
            ),
        ]
        for response in responses:
            assert "$argon2" not in response.text.lower()
            assert "password_hash" not in response.text.lower()

    async def test_forgot_password_does_not_reveal_duplicate_rate_behavior(
        self, account_client, seeded_admin
    ) -> None:
        """Known and unknown emails exhaust a shared rate-limit bucket identically."""
        client, _ = _auth_tuple(*account_client)
        settings = get_settings()
        emails = [ADMIN_EMAIL, "ghost@example.com"]

        for index in range(settings.forgot_password_rate_limit_max):
            response = await client.post(FORGOT_PASSWORD_URL, json={"email": emails[index % 2]})
            assert response.status_code == 200

        blocked = await client.post(FORGOT_PASSWORD_URL, json={"email": "ghost@example.com"})
        assert blocked.status_code == 429

    def test_raw_token_never_equals_stored_hash(self) -> None:
        raw = "raw-token-never-stored-123"
        stored = hash_reset_token(raw)
        assert stored != raw
        assert stored == hash_reset_token(raw)


class TestEmailRendering:
    def test_reset_message_contains_secure_link_and_expected_sections(self) -> None:
        from app.services.email import PASSWORD_RESET_SUBJECT, EmailService

        service = EmailService(
            host="smtp.gmail.com", port=587, username="u@example.com", password="app-password"
        )
        message = service.render_password_reset_message(
            to_email="admin@example.com",
            token="raw-token-abc",
            frontend_url="https://shop.example.com/",
            expires_minutes=30,
        )

        body = message.get_content()
        assert message["Subject"] == PASSWORD_RESET_SUBJECT
        assert message["To"] == "admin@example.com"
        assert "https://shop.example.com/admin/reset-password?token=raw-token-abc" in body
        assert "expire in 30 minutes" in body
        assert "ignore this email" in body.lower()
        assert "$argon2" not in body and "password_hash" not in body

    def test_disabled_email_service_fails_safely(self) -> None:
        from app.services.email import EmailError, EmailService

        service = EmailService(host="", port=587, username="", password="")
        assert service.enabled is False
        try:
            service.send_password_reset_email(
                to_email="admin@example.com",
                token="raw-token-abc",
                frontend_url="https://shop.example.com",
                expires_minutes=30,
            )
        except EmailError:
            pass
        else:
            raise AssertionError("expected EmailError for unconfigured SMTP")

    def test_failure_classification_is_safe_and_credential_free(self) -> None:
        from smtplib import (
            SMTPAuthenticationError,
            SMTPResponseException,
            SMTPSenderRefused,
        )

        from app.services.email import classify_smtp_failure

        auth_error = SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted")
        sender_error = SMTPSenderRefused(550, b"sender rejected", "victim@example.com")
        generic = SMTPResponseException(554, "5.7.1 detail-that-looks-secret")

        assert classify_smtp_failure(auth_error) == "SMTP authentication failed (code 535)"
        assert classify_smtp_failure(sender_error) == "SMTP sender rejected (code 550)"
        assert "victim@example.com" not in classify_smtp_failure(sender_error)
        assert "secret" not in classify_smtp_failure(generic)
        assert classify_smtp_failure(generic).startswith("generic SMTP failure")
        assert classify_smtp_failure(TimeoutError("slow")) == "SMTP operation timed out"
