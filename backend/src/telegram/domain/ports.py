"""Telegram domain ports (abstract interfaces)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol

from src.telegram.domain.entities import TelegramSubscriber


class SubscriberRepository(ABC):
    @abstractmethod
    def upsert(
        self, *, chat_id: int, username: str = "", categories: list[str] | None = None
    ) -> TelegramSubscriber: ...

    @abstractmethod
    def get_by_chat_id(self, chat_id: int) -> TelegramSubscriber | None: ...

    @abstractmethod
    def deactivate(self, chat_id: int) -> bool: ...

    @abstractmethod
    def list_active(self) -> list[TelegramSubscriber]: ...


class MessageSender(Protocol):
    """Outbound port: sends text to Telegram (channel or a chat)."""

    def send_message(
        self, chat_id: int | str, text: str, *, disable_preview: bool = True
    ) -> bool: ...
