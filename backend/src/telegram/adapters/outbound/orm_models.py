"""Telegram persistence adapter: the subscriber row."""

from __future__ import annotations

from django.db import models


class TelegramSubscriberModel(models.Model):
    """A Telegram chat subscribed to new-opportunity notifications."""

    chat_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=64, blank=True, default="")
    # Category keys the chat wants; empty list = all categories.
    categories = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "telegram"
        db_table = "telegram_subscriber"
        verbose_name = "telegram subscriber"
        verbose_name_plural = "telegram subscribers"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Subscriber(chat_id={self.chat_id})"
