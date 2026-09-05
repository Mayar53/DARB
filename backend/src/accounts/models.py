"""
Django expects models in ``<app>/models.py`` for autodiscovery and migrations.
In this hexagonal layout the real definition lives in the persistence adapter;
we only re-export it here so the rest of the layers never import Django models
directly.
"""

from src.accounts.adapters.outbound.admin_application_models import AdminApplication
from src.accounts.adapters.outbound.organization_models import Organization
from src.accounts.adapters.outbound.orm_models import UserModel

__all__ = ["UserModel", "AdminApplication", "Organization"]
