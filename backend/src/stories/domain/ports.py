"""Ports (interfaces) for the stories feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements them with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.stories.domain.entities import ParticipationStory


class StoryRepository(ABC):
    @abstractmethod
    def list_for_opportunity(self, opportunity_id: int) -> list[ParticipationStory]: ...

    @abstractmethod
    def list_by_user(self, user_id: int) -> list[ParticipationStory]: ...

    @abstractmethod
    def get_by_id(self, story_id: int) -> ParticipationStory | None: ...

    @abstractmethod
    def get_for_user_and_opportunity(self, user_id: int, opportunity_id: int) -> ParticipationStory | None: ...

    @abstractmethod
    def exists_for_user_and_opportunity(self, user_id: int, opportunity_id: int) -> bool: ...

    @abstractmethod
    def add(self, *, user_id: int, opportunity_id: int, experience: str) -> ParticipationStory: ...

    @abstractmethod
    def update(self, story: ParticipationStory, **fields) -> ParticipationStory: ...

    @abstractmethod
    def delete(self, story_id: int) -> None: ...

    @abstractmethod
    def toggle_helpful(self, story_id: int, user_id: int) -> ParticipationStory: ...

    @abstractmethod
    def add_flag(self, story_id: int, user_id: int) -> ParticipationStory: ...

    @abstractmethod
    def clear_flags(self, story_id: int) -> ParticipationStory: ...

    @abstractmethod
    def list_flagged(self) -> list[ParticipationStory]: ...
