"""Persistence adapter: the Django ORM models for gamification.

This is the only place that knows about Django's ORM. The domain works with the
``Gamification`` entity; the repository maps between the two.

- ``GamificationModel`` holds the denormalised points + badges for a user.
- ``UserViewModel`` records which opportunities a user has opened (idempotent,
  one row per user+opportunity) — feeds the Explorer badge and "Made for you".
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class GamificationModel(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gamification",
    )
    points = models.PositiveIntegerField(default=0)
    # [ {key, emoji, name, description}, ... ] — computed from real activity.
    badges = models.JSONField(default=list, blank=True)
    # Snapshot of the activity counts that produced the points.
    stats = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "gamification"
        db_table = "gamification_gamificationmodel"
        verbose_name = "gamification"
        verbose_name_plural = "gamification"

    def __str__(self) -> str:
        return f"Gamification(user_id={self.user_id}, points={self.points})"


class UserViewModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="opportunity_views",
    )
    opportunity = models.ForeignKey(
        "opportunities.OpportunityModel",
        on_delete=models.CASCADE,
        related_name="user_views",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "gamification"
        db_table = "gamification_userviewmodel"
        verbose_name = "user view"
        verbose_name_plural = "user views"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_user_opportunity_view",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"View(user_id={self.user_id}, opportunity_id={self.opportunity_id})"
