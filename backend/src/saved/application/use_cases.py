"""
Application use cases for the saved feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import NotFoundError

from src.saved.domain.entities import SavedOpportunity
from src.saved.domain.exceptions import SavedConflict, SavedNotFound
from src.saved.domain.ports import SavedRepository


class ListSaved(UseCase[int, list[SavedOpportunity]]):
    def __init__(self, saved: SavedRepository) -> None:
        self._saved = saved

    def execute(self, user_id: int) -> list[SavedOpportunity]:
        return self._saved.list_for_user(user_id)


class AddSaved(UseCase[int, SavedOpportunity]):
    def __init__(self, saved: SavedRepository, opportunities: OpportunityRepository) -> None:
        self._saved = saved
        self._opportunities = opportunities

    def execute(self, user_id: int, *, opportunity_id: int) -> SavedOpportunity:
        if self._opportunities.get_by_id(opportunity_id) is None:
            raise NotFoundError("Opportunity not found")
        if self._saved.exists(user_id, opportunity_id):
            raise SavedConflict()
        return self._saved.add(user_id=user_id, opportunity_id=opportunity_id)


class RemoveSaved(UseCase[int, None]):
    def __init__(self, saved: SavedRepository) -> None:
        self._saved = saved

    def execute(self, user_id: int, *, opportunity_id: int) -> None:
        if not self._saved.exists(user_id, opportunity_id):
            raise SavedNotFound()
        self._saved.delete(user_id, opportunity_id)
