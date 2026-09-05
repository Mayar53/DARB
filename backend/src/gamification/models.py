"""Django models for the gamification feature (re-exported for autodiscovery)."""

from src.gamification.adapters.outbound.orm_models import (
    GamificationModel,
    UserViewModel,
)

__all__ = ["GamificationModel", "UserViewModel"]
