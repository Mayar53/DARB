"""Ports (interfaces) for the comments feature.

The application layer depends only on these abstractions. The concrete adapter
in ``adapters/outbound`` implements them with the Django ORM.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.comments.domain.entities import Comment


class CommentRepository(ABC):
    @abstractmethod
    def list_for_opportunity(self, opportunity_id: int) -> list[Comment]: ...

    @abstractmethod
    def list_for_story(self, story_id: int) -> list[Comment]: ...

    @abstractmethod
    def get_by_id(self, comment_id: int) -> Comment | None: ...

    @abstractmethod
    def add(
        self,
        *,
        user_id: int,
        text: str,
        opportunity_id: int | None = None,
        story_id: int | None = None,
        parent_id: int | None = None,
    ) -> Comment: ...

    @abstractmethod
    def delete(self, comment_id: int) -> None: ...
