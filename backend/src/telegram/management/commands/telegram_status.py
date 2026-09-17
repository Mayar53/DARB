"""Report the Telegram bot's real state (never prints the token).

    python manage.py telegram_status

Tells you whether the token works, which bot it is, and whether a webhook is
already configured (i.e. whether something else is already handling the bot).
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from src.telegram.adapters.outbound.client import TelegramClient


class Command(BaseCommand):
    help = "Show the Telegram bot's identity and webhook status."

    def handle(self, *args, **options) -> None:
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError(
                "TELEGRAM_BOT_TOKEN is not set. Add it to backend/.env (from @BotFather)."
            )

        client = TelegramClient(token)
        me = client.get_me()
        if me is None:
            raise CommandError("Could not reach Telegram with this token (check the token).")

        self.stdout.write(self.style.SUCCESS(
            f"Bot: @{me.get('username', '?')}  ({me.get('first_name', '')})"
        ))

        info = client.get_webhook_info() or {}
        url = info.get("url") or ""
        if url:
            self.stdout.write(self.style.WARNING(f"Webhook IS set: {url}"))
            self.stdout.write("  -> something else is already handling this bot's updates.")
            self.stdout.write("  -> delete it before registering this backend (or use channel-only).")
        else:
            self.stdout.write(self.style.SUCCESS("Webhook: not set."))
            pending = info.get("pending_update_count", 0)
            self.stdout.write(f"  pending updates: {pending}")
            self.stdout.write("  -> safe to register this backend as the bot's webhook.")
        if info.get("last_error_message"):
            self.stdout.write(self.style.WARNING(f"Last error: {info['last_error_message']}"))

        self.stdout.write(f"Channel configured: {bool(settings.TELEGRAM_CHANNEL_ID)}")
        self.stdout.write(f"Webhook secret set: {bool(settings.TELEGRAM_WEBHOOK_SECRET)}")
        self.stdout.write(f"Frontend base URL: {settings.FRONTEND_BASE_URL or '(not set)'}")
