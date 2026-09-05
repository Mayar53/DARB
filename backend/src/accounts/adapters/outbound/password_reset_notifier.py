"""Email notifier adapter: sends the reset code via Django's mail framework.

In dev this uses the console email backend (prints the code to the console);
in production it uses whatever SMTP backend is configured via env (see
``config/settings/prod.py`` and ``.env.example``).
"""

from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from src.accounts.domain.ports import PasswordResetNotifier


class DjangoPasswordResetNotifier(PasswordResetNotifier):
    def send_code(self, *, email: str, code: str) -> None:
        send_mail(
            subject="Reset your DARB password",
            message=(
                f"Your password reset code is: {code}\n\n"
                "This code expires in 30 minutes. If you did not request a "
                "password reset, you can ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
