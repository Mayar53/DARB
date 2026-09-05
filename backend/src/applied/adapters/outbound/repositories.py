"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from src.applied.adapters.outbound.orm_models import AppliedOpportunityModel
from src.applied.domain.entities import AppliedOpportunity
from src.applied.domain.ports import AppliedRepository


class DjangoAppliedRepository(AppliedRepository):
    def list_for_user(self, user_id: int) -> list[AppliedOpportunity]:
        rows = AppliedOpportunityModel.objects.filter(user_id=user_id)
        return [self._to_entity(row) for row in rows]

    def exists(self, user_id: int, opportunity_id: int) -> bool:
        return AppliedOpportunityModel.objects.filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).exists()

    def add(self, *, user_id: int, opportunity_id: int) -> AppliedOpportunity:
        row = AppliedOpportunityModel.objects.create(
            user_id=user_id,
            opportunity_id=opportunity_id,
        )
        return self._to_entity(row)

    def delete(self, user_id: int, opportunity_id: int) -> None:
        AppliedOpportunityModel.objects.filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).delete()

    @staticmethod
    def _to_entity(row: AppliedOpportunityModel) -> AppliedOpportunity:
        return AppliedOpportunity(
            id=row.pk,
            user_id=row.user_id,
            opportunity_id=row.opportunity_id,
            created_at=row.created_at,
        )
