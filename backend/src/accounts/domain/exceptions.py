"""Accounts-specific errors, specialising the shared domain errors."""

from __future__ import annotations

from src.shared.domain.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
)


class InvalidCredentials(AuthenticationError):
    code = "invalid_credentials"

    def __init__(self, message: str = "Invalid email or password") -> None:
        super().__init__(message)


class EmailAlreadyUsed(ConflictError):
    code = "email_already_used"

    def __init__(self, message: str = "Email is already registered") -> None:
        super().__init__(message)


class UserNotFound(NotFoundError):
    code = "user_not_found"

    def __init__(self, message: str = "User not found") -> None:
        super().__init__(message)


class ApplicationNotFound(NotFoundError):
    code = "application_not_found"

    def __init__(self, message: str = "Admin application not found") -> None:
        super().__init__(message)


class ApplicationAlreadyReviewed(ConflictError):
    code = "application_already_reviewed"

    def __init__(self, message: str = "This admin application has already been reviewed") -> None:
        super().__init__(message)


class ApplicationNotApproved(PermissionDeniedError):
    code = "application_not_approved"

    def __init__(self, message: str = "Your admin application has not been approved yet") -> None:
        super().__init__(message)


class ResetCodeInvalid(NotFoundError):
    code = "reset_code_invalid"

    def __init__(self, message: str = "The reset code is invalid or has expired") -> None:
        super().__init__(message)
