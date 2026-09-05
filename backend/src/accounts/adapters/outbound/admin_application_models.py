"""Persistence adapter: the Django ORM model for admin applications.

An admin application is a request record linked to the applicant's existing
user account (``user`` FK). It starts ``pending`` and is reviewed by the OWNER
(``reviewed_by`` records who decided, ``reviewed_at`` when). The owner can keep
it ``waitlisted`` (re-reviewable, nothing changes on the account) or
``approved`` (the linked user is upgraded to admin in place). ``activated`` is
kept for compatibility with older rows; new approvals no longer create a second
account.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class AdminApplication(models.Model):
    class RequestType(models.TextChoices):
        # A person applying to help Darb research/add opportunities.
        RESEARCH_ADMIN = "admin", "Admin / Researcher"
        # An NGO/organization representative requesting an admin account to
        # publish opportunities directly.
        ORGANIZATION_ADMIN = "org", "Organization Admin"

    email = models.EmailField(db_index=True, unique=True)
    full_name = models.CharField(max_length=255)
    organization = models.CharField(max_length=255, blank=True)
    website = models.URLField(max_length=500, blank=True)
    position = models.CharField(max_length=255, blank=True)
    reason = models.TextField(blank=True)
    # Which kind of admin access is being requested (see RequestType).
    request_type = models.CharField(
        max_length=16,
        choices=RequestType.choices,
        default=RequestType.RESEARCH_ADMIN,
    )
    # pending | waitlisted | approved | activated
    status = models.CharField(max_length=20, default="pending")
    # The applicant's existing account. Null for legacy standalone rows that
    # predate the user-link (those cannot be upgraded in place).
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="admin_applications",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "accounts"
        db_table = "accounts_admin_application"
        verbose_name = "admin application"
        verbose_name_plural = "admin applications"
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self) -> str:
        return f"{self.email} ({self.status})"
