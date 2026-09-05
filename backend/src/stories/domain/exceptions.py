"""Stories-specific errors, specialising the shared domain errors."""

from __future__ import annotations

from src.shared.domain.exceptions import ConflictError, NotFoundError


class StoryNotFound(NotFoundError):
    code = "story_not_found"

    def __init__(self, message: str = "Story not found") -> None:
        super().__init__(message)


class StoryConflict(ConflictError):
    code = "story_conflict"

    def __init__(self, message: str = "You already shared a story for this opportunity") -> None:
        super().__init__(message)
