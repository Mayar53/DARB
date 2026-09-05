"""Applied-opportunity errors, specialising the shared domain errors."""

from __future__ import annotations

from src.shared.domain.exceptions import ConflictError, NotFoundError


class AppliedNotFound(NotFoundError):
    code = "applied_not_found"

    def __init__(self, message: str = "Applied opportunity not found") -> None:
        super().__init__(message)


class AppliedConflict(ConflictError):
    code = "applied_conflict"

    def __init__(self, message: str = "Opportunity is already marked as applied") -> None:
        super().__init__(message)
