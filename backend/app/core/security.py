"""Password hashing, JWT, CSRF, and password-reset token primitives."""

import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher, exceptions

from app.core.config import get_settings

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"

_hasher = PasswordHasher()
_dev_secret: str | None = None
_dummy_hash: str | None = None


class TokenError(Exception):
    """Raised when a JWT cannot be trusted or decoded."""


def hash_password(password: str) -> str:
    """Hash a password with Argon2id and return the encoded hash."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify ``password`` against an Argon2id ``password_hash``."""
    try:
        return _hasher.verify(password_hash, password)
    except (exceptions.VerificationError, exceptions.InvalidHashError):
        return False


def spend_time_for_unknown_email() -> None:
    """Equalize login timing so unknown emails are not detectable.

    Argon2id verification dominates login latency, so a mismatch with no hash to
    verify would otherwise reveal whether an email exists. Verify against a fixed
    dummy hash instead.
    """
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_password("not-a-real-password")
    try:
        _hasher.verify(_dummy_hash, "not-a-real-password")
    except exceptions.VerificationError:
        pass


def get_jwt_secret() -> str:
    """Return the configured JWT secret or an ephemeral development secret.

    In production the config model already requires an explicit secret; the
    random fallback here exists only so local runs work with zero configuration.
    """
    global _dev_secret
    settings = get_settings()
    if settings.jwt_secret:
        return settings.jwt_secret
    if _dev_secret is None:
        _dev_secret = secrets.token_urlsafe(48)
        logger.warning(
            "JWT_SECRET is not configured; using a random ephemeral secret. "
            "Sessions will not survive a restart. Set JWT_SECRET in production."
        )
    return _dev_secret


def create_access_token(subject: str, version: int = 0) -> str:
    """Sign a short-lived JWT whose ``sub`` is the admin document id.

    ``version`` is the admin account's ``token_version``; it is embedded in the
    token so that bumping the account version (after a password/email change)
    invalidates every previously issued session.
    """
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "ver": version,
        "iat": now,
        "exp": now + timedelta(minutes=get_settings().jwt_access_minutes),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token_claims(token: str) -> dict:
    """Verify a JWT and return its payload; raise :class:`TokenError` otherwise."""
    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc
    return payload


def decode_access_token(token: str) -> str:
    """Verify a JWT and return its subject; raise :class:`TokenError` otherwise."""
    payload = decode_access_token_claims(token)
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise TokenError("token subject is missing")
    return subject


def decode_token_version(token: str) -> int:
    """Return the session version claim from a trusted token."""
    value = decode_access_token_claims(token).get("ver", 0)
    if not isinstance(value, int):
        raise TokenError("token version is invalid")
    return value


def generate_reset_token() -> str:
    """Return a cryptographically random, URL-safe opaque reset token."""
    return secrets.token_urlsafe(48)


def hash_reset_token(token: str) -> str:
    """Return a SHA-256 hash of a raw reset token.

    Only the hash is stored in MongoDB; the raw token travels solely via email.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generate an unguessable CSRF token to echo via plain cookie and header."""
    return secrets.token_urlsafe(32)


def tokens_match(cookie: str | None, header: str | None) -> bool:
    """Constant-time comparison of a CSRF cookie and header value."""
    if not cookie or not header:
        return False
    return secrets.compare_digest(cookie.encode("utf-8"), header.encode("utf-8"))
