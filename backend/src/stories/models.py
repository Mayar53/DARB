"""
Django expects models in ``<app>/models.py`` for autodiscovery and migrations.
In this hexagonal layout the real definition lives in the persistence adapter;
we only re-export it here so the rest of the layers never import Django models
directly.
"""

from src.stories.adapters.outbound.orm_models import ParticipationStoryModel

__all__ = ["ParticipationStoryModel"]
