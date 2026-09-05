"""Ports (interfaces) for the gamification feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements them with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.gamification.domain.entities import Gamification


class GamificationRepository(ABC):
    @abstractmethod
    def get_for_user(self, user_id: int) -> Gamification | None: ...

    @abstractmethod
    def save(self, gamification: Gamification) -> Gamification: ...

    @abstractmethod
    def count_distinct_views(self, user_id: int) -> int: ...

    @abstractmethod
    def record_view(self, user_id: int, opportunity_id: int) -> bool: ...
