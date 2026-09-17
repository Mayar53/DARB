"""Model re-exports so Django discovers the telegram app's models."""

from src.telegram.adapters.outbound.orm_models import TelegramSubscriberModel

__all__ = ["TelegramSubscriberModel"]
