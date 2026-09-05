"""
Domain exceptions — framework-agnostic.

The HTTP layer (``config/api.py``) maps these to status codes in one place, so
use cases and the domain can raise meaningful errors without knowing about HTTP.
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain/application errors."""

    code = "domain_error"

    def __init__(self, message: str = "", *, code: str | None = None) -> None:
        super().__init__(message or self.__doc__ or self.code)
        if code:
            self.code = code


class ValidationError(DomainError):
    """The provided data is invalid."""

    code = "validation_error"


class NotFoundError(DomainError):
    """The requested resource does not exist."""

    code = "not_found"


class ConflictError(DomainError):
    """The operation conflicts with the current state (e.g. duplicate)."""

    code = "conflict"


class AuthenticationError(DomainError):
    """Authentication failed or credentials are invalid."""

    code = "authentication_failed"


class PermissionDeniedError(DomainError):
    """The actor is not allowed to perform this action."""

    code = "permission_denied"
