"""Django app config for the telegram feature."""

from __future__ import annotations

from django.apps import AppConfig


class TelegramConfig(AppConfig):
    name = "src.telegram"
    label = "telegram"
    verbose_name = "Telegram"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        # Register the publish→broadcast signal.
        from src.telegram.signals import register

        register()
