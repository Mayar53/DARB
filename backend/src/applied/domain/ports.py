"""Ports (interfaces) for the applied feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements them with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.applied.domain.entities import AppliedOpportunity


class AppliedRepository(ABC):
    @abstractmethod
    def list_for_user(self, user_id: int) -> list[AppliedOpportunity]: ...

    @abstractmethod
    def exists(self, user_id: int, opportunity_id: int) -> bool: ...

    @abstractmethod
    def add(self, *, user_id: int, opportunity_id: int) -> AppliedOpportunity: ...

    @abstractmethod
    def delete(self, user_id: int, opportunity_id: int) -> None: ...
