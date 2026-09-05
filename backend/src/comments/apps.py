"""App config for the comments feature."""

from __future__ import annotations

from django.apps import AppConfig


class CommentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "src.comments"
    label = "comments"
    verbose_name = "Comments"
