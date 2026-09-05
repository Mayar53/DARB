"""Opportunities-specific errors, specialising the shared domain errors."""

from __future__ import annotations

from src.shared.domain.exceptions import NotFoundError


class OpportunityNotFound(NotFoundError):
    code = "opportunity_not_found"

    def __init__(self, message: str = "Opportunity not found") -> None:
        super().__init__(message)
