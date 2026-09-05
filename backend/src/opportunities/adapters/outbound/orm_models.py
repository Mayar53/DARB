"""Persistence adapter: the Django ORM model for opportunities.

This is the only place that knows about Django's ORM. The domain works with the
``Opportunity`` entity; the repository maps between the two.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class OpportunityField(models.Model):
    """A subject/domain tag (chemistry, art, sport…) an opportunity can belong to.

    Supports a two-level hierarchy: a row with ``parent=None`` is a top-level
    subject (Science, Business, Technology…); a row with a parent is a
    subcategory (Chemistry, Accounting, Programming…).
    """

    key = models.CharField(max_length=32, unique=True)
    label_en = models.CharField(max_length=64)
    label_ar = models.CharField(max_length=64)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    color = models.CharField(max_length=16, default="#0E4749")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        app_label = "opportunities"
        db_table = "opportunities_opportunityfield"
        verbose_name = "opportunity field"
        verbose_name_plural = "opportunity fields"
        ordering = ["sort_order", "key"]

    def __str__(self) -> str:
        return self.key


class OpportunityModel(models.Model):
    class Category(models.TextChoices):
        VOLUNTEER = "volunteer", "Volunteering"
        COMPETITION = "competition", "Competitions"
        FELLOWSHIP = "fellowship", "Fellowships"
        SCHOLARSHIP = "scholarship", "Scholarships"
        PROGRAM = "program", "Programs"
        INTERNSHIP = "internship", "Internships"
        COURSE = "course", "Courses"
        WORKSHOP = "workshop", "Workshops"
        SESSION = "session", "Sessions"
        CONFERENCE = "conference", "Conferences"
        GRANT = "grant", "Grants"
        RESEARCH = "research", "Research"
        EXCHANGE = "exchange", "Exchange Programs"

    class Mode(models.TextChoices):
        ONLINE = "online", "Online"
        IN_PERSON = "in-person", "In-person"
        HYBRID = "hybrid", "Hybrid"

    class Funding(models.TextChoices):
        PAID = "paid", "Paid"
        FREE = "free", "Free"
        FULLY_FUNDED = "fully-funded", "Fully funded"
        PARTIALLY_FUNDED = "partially-funded", "Partially funded"

    class Age(models.TextChoices):
        ALL = "all", "All ages"
        EARLY = "13-15", "13-15"
        MID = "15-18", "15-18"
        OLDER = "+18", "+18"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        HIDDEN = "hidden", "Hidden"
        ARCHIVED = "archived", "Archived"

    category = models.CharField(max_length=32, choices=Category.choices)
    title = models.CharField(max_length=255)
    description = models.TextField()
    # Optional per-language overrides. When set for the active locale they take
    # precedence; otherwise the base title/description above is shown in both
    # languages. Kept nullable so single-language opportunities stay untouched.
    title_ar = models.CharField(max_length=255, blank=True, null=True)
    title_en = models.CharField(max_length=255, blank=True, null=True)
    description_ar = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.ONLINE)
    duration = models.CharField(max_length=64, blank=True)
    funding = models.CharField(max_length=16, choices=Funding.choices, default=Funding.FREE)
    # Optional display price for paid opportunities — free text so it supports
    # exact prices, ranges and currencies (e.g. "$50", "200–300 USD"). Empty
    # for free opportunities.
    price = models.CharField(max_length=64, blank=True, default="")
    deadline = models.DateField(null=True, blank=True)
    apply_url = models.URLField(max_length=500)
    # Visibility: only "published" appears publicly. draft/hidden/archived are
    # visible only to the owner/admin in the management dashboard.
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PUBLISHED)
    # Kept for backward compatibility; kept in sync with status on save.
    is_active = models.BooleanField(default=True)
    # Organization/NGO this opportunity belongs to (optional).
    organization = models.ForeignKey(
        "accounts.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="opportunities",
    )
    age = models.CharField(max_length=16, choices=Age.choices, default=Age.ALL)
    certificate = models.BooleanField(default=False)
    fields = models.ManyToManyField(
        OpportunityField, related_name="opportunities", blank=True
    )
    # How many times the "apply now" link was clicked (analytics).
    apply_clicks = models.PositiveIntegerField(default=0)
    # How many times the public detail was viewed (analytics).
    views = models.PositiveIntegerField(default=0)
    # Stable key used by the seed command to stay idempotent.
    seed_key = models.CharField(max_length=64, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="opportunities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "opportunities"
        db_table = "opportunities_opportunity"
        verbose_name = "opportunity"
        verbose_name_plural = "opportunities"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
