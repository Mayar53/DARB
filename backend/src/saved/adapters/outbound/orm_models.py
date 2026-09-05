"""Persistence adapter: the Django ORM model for saved opportunities.

A saved row is a simple join between a user and an opportunity. When either is
deleted the saved row goes with it (CASCADE), which is the right behaviour here
— a saved link is only meaningful while both ends exist.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class SavedOpportunityModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_opportunities",
    )
    opportunity = models.ForeignKey(
        "opportunities.OpportunityModel",
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "saved"
        db_table = "saved_savedopportunity"
        verbose_name = "saved opportunity"
        verbose_name_plural = "saved opportunities"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_saved_per_user_opportunity",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} saved {self.opportunity_id}"
