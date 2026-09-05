"""Django admin (themed by django-unfold) for applied opportunities."""

from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from src.applied.models import AppliedOpportunityModel


@admin.register(AppliedOpportunityModel)
class AppliedOpportunityAdmin(ModelAdmin):
    list_display = ("id", "user", "opportunity", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "opportunity__title")
    ordering = ("-created_at",)
