"""Register the Telegram webhook with the Bot API.

Usage (after deploying, with TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_SECRET set):

    python manage.py set_telegram_webhook --url https://your-backend.onrender.com
    python manage.py set_telegram_webhook --delete
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from src.telegram.adapters.outbound.client import TelegramClient


class Command(BaseCommand):
    help = "Register or delete the Telegram webhook for this backend."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--url",
            default="",
            help="Public base URL of THIS backend (e.g. https://darb-api.onrender.com).",
        )
        parser.add_argument(
            "--delete", action="store_true", help="Delete the webhook instead of setting it."
        )

    def handle(self, *args, **options) -> None:
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError("TELEGRAM_BOT_TOKEN is not set.")
        client = TelegramClient(token)

        if options["delete"]:
            ok = client.delete_webhook()
            self.stdout.write(self.style.SUCCESS("Webhook deleted." if ok else "Delete failed."))
            return

        base = (options["url"] or "").rstrip("/")
        if not base:
            raise CommandError("--url is required (the public backend base URL).")
        secret = settings.TELEGRAM_WEBHOOK_SECRET
        if not secret:
            raise CommandError("TELEGRAM_WEBHOOK_SECRET is not set.")

        webhook_url = f"{base}/api/telegram/webhook/{secret}"
        ok = client.set_webhook(webhook_url, secret)
        self.stdout.write(
            self.style.SUCCESS(f"Webhook set: {webhook_url}")
            if ok
            else self.style.ERROR("Failed to set webhook.")
        )
