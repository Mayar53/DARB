"""Django admin (themed by django-unfold) for saved opportunities."""

from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from src.saved.models import SavedOpportunityModel


@admin.register(SavedOpportunityModel)
class SavedOpportunityAdmin(ModelAdmin):
    list_display = ("id", "user", "opportunity", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "opportunity__title")
    ordering = ("-created_at",)
