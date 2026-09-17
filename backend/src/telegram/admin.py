"""Django admin for the telegram app."""

from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from src.telegram.adapters.outbound.orm_models import TelegramSubscriberModel


@admin.register(TelegramSubscriberModel)
class TelegramSubscriberAdmin(ModelAdmin):
    list_display = ("chat_id", "username", "categories", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("chat_id", "username")
    ordering = ("-created_at",)
