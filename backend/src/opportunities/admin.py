"""Django admin (themed by django-unfold) for opportunities."""

from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from src.opportunities.models import OpportunityField, OpportunityModel


@admin.register(OpportunityModel)
class OpportunityAdmin(ModelAdmin):
    list_display = (
        "id",
        "title",
        "category",
        "fields_display",
        "mode",
        "funding",
        "deadline",
        "is_active",
        "age",
        "certificate",
        "created_at",
    )
    list_filter = (
        "category",
        "mode",
        "funding",
        "is_active",
        "age",
        "certificate",
        "fields",
    )
    search_fields = ("title", "description", "location")
    ordering = ("-created_at",)
    filter_horizontal = ("fields",)

    @admin.display(description="Fields")
    def fields_display(self, obj: OpportunityModel) -> str:
        return ", ".join(f.label_en for f in obj.fields.all()) or "—"


@admin.register(OpportunityField)
class OpportunityFieldAdmin(ModelAdmin):
    list_display = ("key", "label_en", "label_ar")
    search_fields = ("key", "label_en", "label_ar")
    ordering = ("key",)
