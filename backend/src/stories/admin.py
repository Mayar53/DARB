"""Django admin (themed by django-unfold) for participation stories."""

from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from src.stories.models import ParticipationStoryModel


@admin.register(ParticipationStoryModel)
class ParticipationStoryAdmin(ModelAdmin):
    list_display = (
        "id",
        "user",
        "opportunity",
        "created_at",
        "updated_at",
    )
    list_filter = ("created_at",)
    search_fields = ("experience", "user__email", "user__full_name")
    ordering = ("-created_at",)
