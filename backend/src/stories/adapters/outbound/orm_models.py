"""Persistence adapter: the Django ORM model for participation stories.

This is the only place that knows about Django's ORM. The domain works with the
``ParticipationStory`` entity; the repository maps between the two.

``opportunity`` uses ``on_delete=PROTECT`` on purpose: deleting an opportunity
must never silently wipe users' shared stories. An admin who tries to delete an
opportunity that has stories gets a Django ``ProtectedError`` instead, which
tells them to mark the opportunity inactive instead.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from src.stories.domain.entities import MAX_EXPERIENCE_LENGTH


class ParticipationStoryModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="participation_stories",
    )
    opportunity = models.ForeignKey(
        "opportunities.OpportunityModel",
        on_delete=models.PROTECT,
        related_name="participation_stories",
    )
    experience = models.TextField(max_length=MAX_EXPERIENCE_LENGTH)
    helpful = models.JSONField(default=list, blank=True)  # [user_id, ...]
    flags = models.JSONField(default=list, blank=True)    # [user_id, ...]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "stories"
        db_table = "stories_participationstory"
        verbose_name = "participation story"
        verbose_name_plural = "participation stories"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_story_per_user_opportunity",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Story by {self.user_id} on opportunity {self.opportunity_id}"
