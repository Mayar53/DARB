"""Telegram persistence adapter: maps the ORM row to/from the domain entity."""

from __future__ import annotations

from src.telegram.adapters.outbound.orm_models import TelegramSubscriberModel
from src.telegram.domain.entities import TelegramSubscriber
from src.telegram.domain.ports import SubscriberRepository


class DjangoSubscriberRepository(SubscriberRepository):
    def upsert(
        self, *, chat_id: int, username: str = "", categories: list[str] | None = None
    ) -> TelegramSubscriber:
        row, _ = TelegramSubscriberModel.objects.get_or_create(chat_id=chat_id)
        if username:
            row.username = username
        if categories is not None:
            row.categories = sorted({c.strip() for c in categories if c.strip()})
        row.is_active = True
        row.save()
        return self._to_entity(row)

    def get_by_chat_id(self, chat_id: int) -> TelegramSubscriber | None:
        row = TelegramSubscriberModel.objects.filter(chat_id=chat_id).first()
        return self._to_entity(row) if row else None

    def deactivate(self, chat_id: int) -> bool:
        return bool(
            TelegramSubscriberModel.objects.filter(chat_id=chat_id).update(is_active=False)
        )

    def list_active(self) -> list[TelegramSubscriber]:
        return [self._to_entity(r) for r in TelegramSubscriberModel.objects.filter(is_active=True)]

    @staticmethod
    def _to_entity(row: TelegramSubscriberModel) -> TelegramSubscriber:
        return TelegramSubscriber(
            id=row.pk,
            chat_id=row.chat_id,
            username=row.username,
            categories=list(row.categories or []),
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
