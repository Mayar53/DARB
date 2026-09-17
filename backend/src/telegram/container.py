"""Composition root for the telegram feature."""

from __future__ import annotations

from functools import lru_cache

from django.conf import settings

from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.telegram.adapters.outbound.client import TelegramClient
from src.telegram.adapters.outbound.repositories import DjangoSubscriberRepository
from src.telegram.application.use_cases import BroadcastOpportunity, HandleUpdate


class TelegramContainer:
    def __init__(self) -> None:
        self.subscribers = DjangoSubscriberRepository()
        self.sender = TelegramClient(settings.TELEGRAM_BOT_TOKEN)
        self.opportunities = DjangoOpportunityRepository()

    @property
    def handle_update(self) -> HandleUpdate:
        return HandleUpdate(
            self.subscribers,
            self.sender,
            self.opportunities,
            settings.FRONTEND_BASE_URL,
        )

    @property
    def broadcast_opportunity(self) -> BroadcastOpportunity:
        return BroadcastOpportunity(
            self.subscribers,
            self.sender,
            settings.TELEGRAM_CHANNEL_ID,
        )


@lru_cache(maxsize=1)
def container() -> TelegramContainer:
    return TelegramContainer()
