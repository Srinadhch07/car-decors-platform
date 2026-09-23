"""Reusable Gmail SMTP email delivery (backend only, never exposed to React)."""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import Settings

logger = logging.getLogger(__name__)

PASSWORD_RESET_SUBJECT = "Reset your admin password"

#: Seconds allowed for each SMTP network operation before timing out.
_SMTP_TIMEOUT_SECONDS = 15


def classify_smtp_failure(exc: BaseException) -> str:
    """Map an smtplib/socket exception to a safe, credential-free diagnostic.

    Only exception *types* and integer SMTP status codes are reported; never
    exception messages, which can embed addresses or other data. The returned
    string is safe to log and safe to show on the diagnostic script.
    """
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return f"SMTP authentication failed (code {exc.smtp_code})"
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "SMTP sender rejected" + (
            f" (code {exc.smtp_code})" if getattr(exc, "smtp_code", None) else ""
        )
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "SMTP recipient rejected"
    if isinstance(exc, smtplib.SMTPDataError):
        return "SMTP server rejected the message" + (
            f" (code {exc.smtp_code})" if getattr(exc, "smtp_code", None) else ""
        )
    if isinstance(exc, smtplib.SMTPNotSupportedError):
        return "STARTTLS not supported by the SMTP server"
    if isinstance(exc, smtplib.SMTPHeloError):
        return "SMTP greeting (EHLO) failed"
    if isinstance(exc, ssl.SSLError):
        return "STARTTLS negotiation failed"
    if isinstance(exc, TimeoutError):
        return "SMTP operation timed out"
    # ``smtplib.SMTPException`` subclasses ``OSError``, so smtplib-specific
    # errors must be matched before the generic network branch below.
    if isinstance(exc, smtplib.SMTPException):
        code = getattr(exc, "smtp_code", None)
        return "generic SMTP failure" + (f" (code {code})" if code else "")
    if isinstance(exc, OSError):
        return "SMTP connection failed (DNS or network)"
    return f"SMTP delivery failed (unexpected {type(exc).__name__})"


class EmailError(Exception):
    """Raised when a message cannot be delivered.

    The exception carries no credentials and no reset-token material; callers
    must treat it as an opaque delivery failure.
    """


class EmailService:
    """Sends transactional email over Gmail SMTP with STARTTLS."""

    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str = "",
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from_email = from_email or username

    @property
    def enabled(self) -> bool:
        """True when SMTP credentials exist so real delivery is possible."""
        return bool(self._host and self._username and self._password)

    def render_password_reset_message(
        self, *, to_email: str, token: str, frontend_url: str, expires_minutes: int
    ) -> EmailMessage:
        """Build the password-reset message; the raw token appears only here."""
        link = f"{frontend_url.rstrip('/')}/admin/reset-password?token={token}"
        body = (
            "Hello,\n\n"
            "A password reset was requested for the admin account on your car "
            "decor platform.\n\n"
            f"Reset your password:\n{link}\n\n"
            f"This link will expire in {expires_minutes} minutes and can be "
            "used only once.\n\n"
            "If you did not request a password reset, you can safely ignore "
            "this email. No changes have been made to your account.\n\n"
            "Security note: Car Decor will never ask you for your password or "
            "this link in an email.\n"
        )
        message = EmailMessage()
        message["Subject"] = PASSWORD_RESET_SUBJECT
        message["From"] = self._from_email
        message["To"] = to_email
        message.set_content(body)
        return message

    def send_password_reset_email(
        self, *, to_email: str, token: str, frontend_url: str, expires_minutes: int
    ) -> None:
        """Send the password-reset email over Gmail SMTP with STARTTLS.

        Credentials are used only to log in here; they are never logged, never
        returned by an API, and never flow to the frontend. Each failure stage
        is logged with a safe, credential-free category (see
        :func:`classify_smtp_failure`) and surfaces as :class:`EmailError` with
        no sensitive detail attached.
        """
        if not self.enabled:
            logger.warning(
                "Password-reset email delivery failed: SMTP configuration incomplete. "
                "Set SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD in production configuration."
            )
            raise EmailError("SMTP delivery is not configured")
        message = self.render_password_reset_message(
            to_email=to_email,
            token=token,
            frontend_url=frontend_url,
            expires_minutes=expires_minutes,
        )
        try:
            smtp = smtplib.SMTP(self._host, self._port, timeout=_SMTP_TIMEOUT_SECONDS)
        except (OSError, smtplib.SMTPException) as exc:
            logger.warning(
                "Password-reset email delivery failed: %s",
                classify_smtp_failure(exc),
            )
            raise EmailError("could not connect to the SMTP server") from exc
        try:
            try:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            except (OSError, smtplib.SMTPException) as exc:
                logger.warning(
                    "Password-reset email delivery failed: %s (STARTTLS stage)",
                    classify_smtp_failure(exc),
                )
                raise EmailError("could not negotiate STARTTLS") from exc
            try:
                smtp.login(self._username, self._password)
            except (OSError, smtplib.SMTPException) as exc:
                logger.warning(
                    "Password-reset email delivery failed: %s (authentication stage)",
                    classify_smtp_failure(exc),
                )
                raise EmailError("SMTP authentication failed") from exc
            try:
                smtp.send_message(message)
            except (OSError, smtplib.SMTPException) as exc:
                logger.warning(
                    "Password-reset email delivery failed: %s (send stage)",
                    classify_smtp_failure(exc),
                )
                raise EmailError("could not deliver the email") from exc
        finally:
            try:
                smtp.quit()
            except smtplib.SMTPException:
                pass


def build_email_service(settings: Settings) -> EmailService:
    """Construct the email service from application settings."""
    return EmailService(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        from_email=settings.smtp_from_email,
    )
