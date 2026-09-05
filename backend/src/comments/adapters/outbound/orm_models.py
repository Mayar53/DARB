"""Persistence adapter: the Django ORM model for comments.

This is the only place that knows about Django's ORM. The domain works with the
``Comment`` entity; the repository maps between the two.

A comment targets exactly one thing: an opportunity OR a story (enforced by a
CHECK constraint). ``user`` cascades so deleting an account removes their
comments; ``opportunity``/``story`` cascade so removing the target removes its
comments.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from src.comments.domain.entities import MAX_COMMENT_LENGTH


class CommentModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    opportunity = models.ForeignKey(
        "opportunities.OpportunityModel",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    story = models.ForeignKey(
        "stories.ParticipationStoryModel",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    # Parent comment for replies. A reply shares the same target container
    # (opportunity) as its parent. Null for top-level comments. One level of
    # nesting is enforced in the application layer (a reply cannot have a reply).
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    text = models.TextField(max_length=MAX_COMMENT_LENGTH)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "comments"
        db_table = "comments_commentmodel"
        verbose_name = "comment"
        verbose_name_plural = "comments"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(opportunity__isnull=False) | models.Q(story__isnull=False),
                name="comment_needs_a_target",
            ),
        ]

    def __str__(self) -> str:
        return f"Comment by {self.user_id} (text={self.text[:20]!r})"
