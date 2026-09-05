"""Persistence adapter: the Django ORM model for organizations/NGOs.

An organization is created from an approved admin application (or directly by
the OWNER). Admins can be assigned to one or more organizations; opportunities
belong to an organization via ``OpportunityModel.organization``.
"""

from __future__ import annotations

from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    website = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "accounts"
        db_table = "accounts_organization"
        verbose_name = "organization"
        verbose_name_plural = "organizations"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
