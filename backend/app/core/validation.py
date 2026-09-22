"""Reusable validation helpers for request schemas."""

from urllib.parse import urlparse


def is_http_url(value: str) -> bool:
    """True when ``value`` is an absolute http(s) URL with a host."""
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def is_root_relative_path(value: str) -> bool:
    """True when ``value`` is a safe root-relative path (no ``..`` segments)."""
    return value.startswith("/") and ".." not in value


def validate_url_or_path(value: str, *, allow_relative: bool) -> str:
    """Validate a URL (or optionally a root-relative path) and return it.

    Used for image/logo metadata so values are safe to render and track later;
    actual upload storage is a separate stage.
    """
    if any(ord(char) < 32 for char in value):
        raise ValueError("URL contains control characters")
    if allow_relative and is_root_relative_path(value):
        return value
    if not is_http_url(value):
        raise ValueError("must be an absolute http(s) URL or a root-relative path")
    return value
