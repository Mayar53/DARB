"""
Ports (interfaces) for the accounts feature.

The application layer depends only on these abstractions. Concrete adapters in
``adapters/outbound`` implement them (Django ORM, Argon2, PyJWT).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.accounts.domain.admin_application import AdminApplication, AdminApplicationStatus
from src.accounts.domain.entities import Organization, TokenPair, User
from src.accounts.domain.password_reset import PasswordResetCode


class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: int) -> User | None: ...

    @abstractmethod
    def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    def exists_by_email(self, email: str) -> bool: ...

    @abstractmethod
    def add(self, *, email: str, full_name: str, password_hash: str, nickname: str = "") -> User: ...

    @abstractmethod
    def add_admin(self, *, email: str, full_name: str, password_hash: str, nickname: str = "", permissions: list[str] | None = None) -> User: ...

    @abstractmethod
    def list_admins(self) -> list[User]: ...

    @abstractmethod
    def list_staff_without_application(self) -> list[User]: ...

    @abstractmethod
    def list_users(self) -> list[User]: ...

    @abstractmethod
    def update_profile(self, user_id: int, *, nickname: str | None = None, avatar: str | None = None) -> User | None: ...

    @abstractmethod
    def set_staff(self, user_id: int, *, is_staff: bool, is_superuser: bool) -> User | None: ...

    @abstractmethod
    def set_role(self, user_id: int, *, role: str, permissions: list[str] | None = None) -> User | None: ...

    @abstractmethod
    def update_admin(self, user_id: int, *, is_active: bool | None = None, permissions: list[str] | None = None) -> User | None: ...

    @abstractmethod
    def update_password(self, user_id: int, new_password: str) -> User | None: ...

    @abstractmethod
    def assign_organization(self, user_id: int, organization_id: int) -> None: ...

    @abstractmethod
    def set_organizations(self, user_id: int, organization_ids: list[int]) -> None: ...


class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, raw_password: str) -> str: ...

    @abstractmethod
    def verify(self, raw_password: str, hashed: str) -> bool: ...


class TokenService(ABC):
    @abstractmethod
    def issue(self, user: User) -> TokenPair: ...

    @abstractmethod
    def subject_from_refresh(self, refresh_token: str) -> int: ...


class AdminApplicationRepository(ABC):
    """Stores admin applications linked to the applicant's existing account."""

    @abstractmethod
    def create(
        self,
        *,
        email: str,
        full_name: str,
        organization: str = "",
        website: str = "",
        position: str = "",
        reason: str = "",
        user_id: int | None = None,
        request_type: str = "admin",
    ) -> AdminApplication: ...

    @abstractmethod
    def get_by_email(self, email: str) -> AdminApplication | None: ...

    @abstractmethod
    def get_by_user_id(self, user_id: int) -> AdminApplication | None: ...

    @abstractmethod
    def get_by_id(self, application_id: int) -> AdminApplication | None: ...

    @abstractmethod
    def list_all(self, request_type: str | None = None) -> list[AdminApplication]: ...

    @abstractmethod
    def list_by_status(self, status: AdminApplicationStatus | str) -> list[AdminApplication]: ...

    @abstractmethod
    def set_status(
        self,
        application_id: int,
        *,
        status: AdminApplicationStatus | str,
        reviewed_by: int | None = None,
    ) -> AdminApplication | None: ...


class OrganizationRepository(ABC):
    @abstractmethod
    def create(self, *, name: str, website: str = "", description: str = "") -> Organization: ...

    @abstractmethod
    def get_by_id(self, organization_id: int) -> Organization | None: ...

    @abstractmethod
    def get_by_name(self, name: str) -> Organization | None: ...

    @abstractmethod
    def list_all(self) -> list[Organization]: ...


class PasswordResetRepository(ABC):
    """Stores short-lived, single-use password reset codes (hashed)."""

    @abstractmethod
    def create(self, *, email: str, code_hash: str, expires_at) -> PasswordResetCode: ...

    @abstractmethod
    def get_latest(self, email: str) -> PasswordResetCode | None: ...

    @abstractmethod
    def invalidate_for_email(self, email: str) -> None: ...

    @abstractmethod
    def mark_used(self, code_id: int) -> None: ...


class PasswordResetNotifier(ABC):
    """Sends the plaintext reset code to the user (email in practice)."""

    @abstractmethod
    def send_code(self, *, email: str, code: str) -> None: ...
