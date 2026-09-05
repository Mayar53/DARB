"""
Ports (interfaces) for the opportunities feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements it with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from src.opportunities.domain.entities import Opportunity


class OpportunityRepository(ABC):
    @abstractmethod
    def list_all(self, *, include_inactive: bool = False) -> list[Opportunity]: ...

    @abstractmethod
    def list_by_owner(self, owner_id: int) -> list[Opportunity]: ...

    @abstractmethod
    def get_by_id(self, opportunity_id: int) -> Opportunity | None: ...

    @abstractmethod
    def add(
        self,
        *,
        category: str,
        title: str,
        description: str,
        location: str,
        mode: str,
        duration: str,
        funding: str,
        price: str = "",
        deadline: date | None,
        apply_url: str,
        is_active: bool | None = None,
        created_by: int | None,
        status: str = "published",
        organization: int | None = None,
        age: str = "all",
        certificate: bool = False,
        fields: list[str] | None = None,
    ) -> Opportunity: ...

    @abstractmethod
    def update(self, opportunity: Opportunity, **fields) -> Opportunity: ...

    @abstractmethod
    def delete(self, opportunity_id: int) -> None: ...

    @abstractmethod
    def increment_apply_clicks(self, opportunity_id: int) -> None: ...

    @abstractmethod
    def increment_views(self, opportunity_id: int) -> None: ...

    @abstractmethod
    def list_subject_fields(self) -> list[dict]: ...

    @abstractmethod
    def bulk_add(self, items: list[dict]) -> list[Opportunity]: ...
