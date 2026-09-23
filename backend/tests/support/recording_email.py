"""In-memory stand-in for the Gmail SMTP email service used in tests."""

from app.services.email import EmailError


class RecordingEmailService:
    """Records password-reset deliveries without touching any network."""

    def __init__(self) -> None:
        self.sent: list[dict] = []
        self.fail_delivery = False

    def send_password_reset_email(
        self, *, to_email: str, token: str, frontend_url: str, expires_minutes: int
    ) -> None:
        if self.fail_delivery:
            raise EmailError("delivery failed (recording stub)")
        self.sent.append(
            {
                "to_email": to_email,
                "token": token,
                "frontend_url": frontend_url,
                "expires_minutes": expires_minutes,
            }
        )
