"""Safe SMTP diagnostic for password-reset email delivery.

Usage (from the ``backend`` directory, matching the settings environment):

    $env:APP_ENV = "production"   # so .env.production is loaded
    python scripts/test_email.py            # config + connection + STARTTLS + auth only
    python scripts/test_email.py --send     # also sends a harmless test message

It NEVER prints credentials, never sends a password-reset token, and never
touches MongoDB or admin accounts. Output is a fixed set of safe lines, e.g.:

    SMTP configuration: OK
    SMTP connection: OK
    STARTTLS: OK
    SMTP authentication: OK

Full-blown password-reset correctness is covered by the backend test suite;
this script exists to isolate the live SMTP transport from the rest of the
flow. Exits non-zero when any stage fails.
"""

from __future__ import annotations

import argparse
import email.message
import os
import smtplib
import ssl

# Run from the backend directory so `app` is importable regardless of CWD.
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")

from app.core.config import get_settings  # noqa: E402
from app.services.email import (  # noqa: E402
    _SMTP_TIMEOUT_SECONDS,
    classify_smtp_failure,
)

PASS = "OK"
FAIL = "FAILED"


def _configured(settings) -> bool:
    missing = []
    if not settings.smtp_host:
        missing.append("SMTP_HOST")
    if not settings.smtp_port:
        missing.append("SMTP_PORT")
    if not settings.smtp_username:
        missing.append("SMTP_USERNAME")
    if not settings.smtp_password:
        missing.append("SMTP_PASSWORD")
    for name in missing:
        print(f"  - {name}: not configured")
    return not missing


def _connect_and_auth(settings, *, send_test: bool) -> None:
    host = settings.smtp_host
    port = settings.smtp_port

    try:
        smtp = smtplib.SMTP(host, port, timeout=_SMTP_TIMEOUT_SECONDS)
    except (OSError, smtplib.SMTPException) as exc:
        print(f"SMTP connection: {FAIL} ({classify_smtp_failure(exc)})")
        raise SystemExit(1) from None
    try:
        try:
            smtp.ehlo()
        except (OSError, smtplib.SMTPException) as exc:
            print(f"SMTP connection: {FAIL} ({classify_smtp_failure(exc)})")
            raise SystemExit(1) from None
        print("SMTP connection: OK")

        try:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        except (OSError, smtplib.SMTPException) as exc:
            print(f"STARTTLS: {FAIL} ({classify_smtp_failure(exc)})")
            raise SystemExit(1) from None
        print("STARTTLS: OK")

        try:
            smtp.login(settings.smtp_username, settings.smtp_password)
        except (OSError, smtplib.SMTPException) as exc:
            print(f"SMTP authentication: {FAIL} ({classify_smtp_failure(exc)})")
            raise SystemExit(1) from None
        print("SMTP authentication: OK")

        if send_test:
            recipient = settings.smtp_from_email or settings.smtp_username
            message = email.message.EmailMessage()
            message["Subject"] = "Car Decor SMTP configuration test - no action needed"
            message["From"] = settings.smtp_from_email or settings.smtp_username
            message["To"] = recipient
            message.set_content(
                "This is an automated configuration test from the Car Decor "
                "platform password-reset system. No password-reset token was "
                "sent. You can safely delete this message."
            )
            try:
                smtp.send_message(message)
            except (OSError, smtplib.SMTPException) as exc:
                print(f"SMTP test message: {FAIL} ({classify_smtp_failure(exc)})")
                raise SystemExit(1) from None
            print("SMTP test message: SENT (to the configured sender address)")
    finally:
        try:
            smtp.quit()
        except smtplib.SMTPException:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Safe SMTP diagnostic for the car decor platform.")
    parser.add_argument(
        "--send",
        action="store_true",
        help="Also send a harmless test message to the configured sender address.",
    )
    args = parser.parse_args()

    settings = get_settings()
    env_override = os.environ.get("APP_ENV", "").strip().lower()
    print(f"APP_ENV={settings.app_env}")
    print(f"SMTP_FILE_SOURCE={env_override or 'development/defaults'}")
    print(f"FRONTEND_URL={settings.frontend_url}")
    print(f"SMTP_HOST={settings.smtp_host}")
    print(f"SMTP_PORT={settings.smtp_port}")
    print(f"SMTP_USERNAME_CONFIGURED={bool(settings.smtp_username)}")
    print(f"SMTP_PASSWORD_CONFIGURED={bool(settings.smtp_password)}")
    print(f"SMTP_FROM_EMAIL_CONFIGURED={bool(settings.smtp_from_email)}")

    if not _configured(settings):
        print("SMTP configuration: FAILED (missing variables above)")
        raise SystemExit(1) from None
    print("SMTP configuration: OK")
    _connect_and_auth(settings, send_test=args.send)

    print("SMTP diagnostic complete.")
    raise SystemExit(0)


if __name__ == "__main__":
    main()
