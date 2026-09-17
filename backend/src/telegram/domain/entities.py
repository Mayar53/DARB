"""Telegram domain entities (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.shared.domain.entity import Entity


@dataclass(kw_only=True)
class TelegramSubscriber(Entity):
    """A Telegram chat that receives new-opportunity notifications.

    ``categories`` holds the opportunity category keys the subscriber wants; an
    empty list means "all categories".
    """

    chat_id: int
    username: str = ""
    categories: list[str] = field(default_factory=list)
    is_active: bool = True

    def wants(self, category: str) -> bool:
        return not self.categories or category in self.categories
