"""Saved-opportunity errors, specialising the shared domain errors."""

from __future__ import annotations

from src.shared.domain.exceptions import ConflictError, NotFoundError


class SavedNotFound(NotFoundError):
    code = "saved_not_found"

    def __init__(self, message: str = "Saved opportunity not found") -> None:
        super().__init__(message)


class SavedConflict(ConflictError):
    code = "saved_conflict"

    def __init__(self, message: str = "Opportunity is already saved") -> None:
        super().__init__(message)
