"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from src.saved.adapters.outbound.orm_models import SavedOpportunityModel
from src.saved.domain.entities import SavedOpportunity
from src.saved.domain.ports import SavedRepository


class DjangoSavedRepository(SavedRepository):
    def list_for_user(self, user_id: int) -> list[SavedOpportunity]:
        rows = SavedOpportunityModel.objects.filter(user_id=user_id)
        return [self._to_entity(row) for row in rows]

    def exists(self, user_id: int, opportunity_id: int) -> bool:
        return SavedOpportunityModel.objects.filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).exists()

    def add(self, *, user_id: int, opportunity_id: int) -> SavedOpportunity:
        row = SavedOpportunityModel.objects.create(
            user_id=user_id,
            opportunity_id=opportunity_id,
        )
        return self._to_entity(row)

    def delete(self, user_id: int, opportunity_id: int) -> None:
        SavedOpportunityModel.objects.filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).delete()

    @staticmethod
    def _to_entity(row: SavedOpportunityModel) -> SavedOpportunity:
        return SavedOpportunity(
            id=row.pk,
            user_id=row.user_id,
            opportunity_id=row.opportunity_id,
            created_at=row.created_at,
        )
