"""
Application use cases for the applied feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from src.applied.domain.entities import AppliedOpportunity
from src.applied.domain.exceptions import AppliedConflict, AppliedNotFound
from src.applied.domain.ports import AppliedRepository
from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import NotFoundError


class ListApplied(UseCase[int, list[AppliedOpportunity]]):
    def __init__(self, applied: AppliedRepository) -> None:
        self._applied = applied

    def execute(self, user_id: int) -> list[AppliedOpportunity]:
        return self._applied.list_for_user(user_id)


class AddApplied(UseCase[int, AppliedOpportunity]):
    def __init__(self, applied: AppliedRepository, opportunities: OpportunityRepository) -> None:
        self._applied = applied
        self._opportunities = opportunities

    def execute(self, user_id: int, *, opportunity_id: int) -> AppliedOpportunity:
        if self._opportunities.get_by_id(opportunity_id) is None:
            raise NotFoundError("Opportunity not found")
        if self._applied.exists(user_id, opportunity_id):
            raise AppliedConflict()
        return self._applied.add(user_id=user_id, opportunity_id=opportunity_id)


class RemoveApplied(UseCase[int, None]):
    def __init__(self, applied: AppliedRepository) -> None:
        self._applied = applied

    def execute(self, user_id: int, *, opportunity_id: int) -> None:
        if not self._applied.exists(user_id, opportunity_id):
            raise AppliedNotFound()
        self._applied.delete(user_id, opportunity_id)
