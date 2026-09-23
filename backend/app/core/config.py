"""Environment-based application settings."""

import os
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def default_env_file() -> list[str]:
    """Return the dotenv file(s) to load for the current ``APP_ENV``.

    Real deployment-platform environment variables always take precedence over
    dotenv files. ``.env.production`` is used when ``APP_ENV=production`` (or
    ``prod``) so production secrets can live in a separate, git-ignored file
    instead of the development ``.env``.
    """
    env = os.environ.get("APP_ENV", "").strip().lower()
    if env in {"production", "prod"}:
        return [".env.production"]
    return [".env"]


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables and dotenv files.

    All values have sensible local defaults so the application can boot without
    any external infrastructure. Deployment-specific values are injected purely
    through the environment, keeping the application deployment-agnostic.

    Development reads ``.env``; production (``APP_ENV=production``) reads
    ``.env.production``. Platform-injected variables always win.
    """

    model_config = SettingsConfigDict(
        env_file=default_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Car Decor Platform API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_prefix: str = "/api"

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "car_decor"
    mongo_timeout_ms: int = 3000

    # CORS: comma-separated list of allowed origins.
    cors_origins: str = "http://localhost:5173"

    # Seeding (used by the CLI seed script).
    seed_admin_email: str = "admin@example.com"
    # Plaintext development password; hashed at seed time. Use only with a
    # throwaway dev account - never a production credential.
    seed_admin_password: str = ""
    # Advanced override: pre-computed Argon2 hash wins over the plaintext above.
    seed_admin_password_hash: str = ""
    seed_sample_data: bool = False

    # Authentication and session cookies.
    jwt_secret: str = ""
    jwt_access_minutes: int = 30
    cookie_name: str = "car_decor_session"
    csrf_cookie_name: str = "car_decor_csrf"
    cookie_domain: str = ""
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # Login rate limiting.
    login_rate_limit_max: int = 5
    login_rate_limit_window_minutes: int = 15

    # Account management: password reset (Gmail SMTP, backend-only).
    # SMTP credentials must never be exposed to the frontend or committed.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    # Base URL of the storefront; the backend builds reset links from it.
    frontend_url: str = "http://localhost:5173"
    # Lifetime of a single-use password-reset token (minutes).
    password_reset_token_minutes: int = 30
    # Forgot-password and reset-password rate limiting (per client IP).
    forgot_password_rate_limit_max: int = 5
    forgot_password_rate_limit_window_minutes: int = 15
    reset_password_rate_limit_max: int = 5
    reset_password_rate_limit_window_minutes: int = 15

    # Image storage. "local" is the development-safe default; "s3" activates
    # the Amazon S3 adapter which requires AWS credentials and a bucket.
    storage_mode: str = "local"
    # Directory used by the local adapter; served at /media when mounting.
    storage_local_dir: str = "storage-local"

    # Amazon S3 (only relevant in "s3" storage mode). Never committed.
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = ""
    aws_s3_bucket: str = ""
    # Optional public CDN/URL prefix; when empty the standard S3
    # virtual-hosted bucket URL is used for the image reference.
    aws_s3_public_url: str = ""

    # Product image upload limits (bytes). 5 MB is the documented maximum.
    product_image_max_bytes: int = 5 * 1024 * 1024

    @field_validator("cookie_samesite")
    @classmethod
    def _validate_samesite(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            raise ValueError("cookie_samesite must be one of: lax, strict, none")
        return normalized

    @field_validator("storage_mode")
    @classmethod
    def _validate_storage_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "s3"}:
            raise ValueError("storage_mode must be one of: local, s3")
        return normalized

    @model_validator(mode="after")
    def _validate_environment(self) -> "Settings":
        if not self.is_production:
            return self
        checks: list[str] = []
        if not self.jwt_secret:
            checks.append(
                "JWT_SECRET must be configured in production; refusing to start "
                "with an ephemeral secret that invalidates sessions on restart."
            )
        if self.debug:
            checks.append("DEBUG must be false in production.")
        if not self.cookie_secure:
            checks.append(
                "COOKIE_SECURE must be true in production so session and CSRF "
                "cookies are only sent over HTTPS."
            )
        if not self.cors_origins_list:
            checks.append(
                "CORS_ORIGINS must list the production frontend origin(s); "
                "wildcard '*' is not allowed with credentialed requests."
            )
        if any(origin == "*" for origin in self.cors_origins_list):
            checks.append(
                "CORS_ORIGINS must not use wildcard '*' because credentials (cookies) are enabled."
            )
        if checks:
            raise ValueError("\n".join(f"- {c}" for c in checks))
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Return the configured origins as a clean list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""
    return Settings()
