"""Ports (interfaces) for the saved feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements them with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.saved.domain.entities import SavedOpportunity


class SavedRepository(ABC):
    @abstractmethod
    def list_for_user(self, user_id: int) -> list[SavedOpportunity]: ...

    @abstractmethod
    def exists(self, user_id: int, opportunity_id: int) -> bool: ...

    @abstractmethod
    def add(self, *, user_id: int, opportunity_id: int) -> SavedOpportunity: ...

    @abstractmethod
    def delete(self, user_id: int, opportunity_id: int) -> None: ...
