"""Persistence adapter: the Django ORM model for applied opportunities.

A row marks that a user applied to an opportunity. When either end is deleted
the row goes with it (CASCADE).
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class AppliedOpportunityModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applied_opportunities",
    )
    opportunity = models.ForeignKey(
        "opportunities.OpportunityModel",
        on_delete=models.CASCADE,
        related_name="applied_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "applied"
        db_table = "applied_appliedopportunity"
        verbose_name = "applied opportunity"
        verbose_name_plural = "applied opportunities"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_applied_per_user_opportunity",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} applied to {self.opportunity_id}"
