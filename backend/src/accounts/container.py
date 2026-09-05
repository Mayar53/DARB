"""
Composition root for the accounts feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. The router asks the container for a use case; nothing else constructs
adapters. Swap an adapter here (e.g. a different repository) and the whole
feature follows — that is the payoff of Ports & Adapters.
"""

from __future__ import annotations

from functools import lru_cache

from src.accounts.adapters.outbound.admin_application_repository import (
    DjangoAdminApplicationRepository,
)
from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
from src.accounts.adapters.outbound.organization_repository import DjangoOrganizationRepository
from src.accounts.adapters.outbound.password_reset_notifier import DjangoPasswordResetNotifier
from src.accounts.adapters.outbound.password_reset_repository import DjangoPasswordResetRepository
from src.accounts.adapters.outbound.repositories import DjangoUserRepository
from src.accounts.adapters.outbound.tokens import JwtTokenService
from src.accounts.application.use_cases import (
    ApplyForAdmin,
    AuthenticateUser,
    CreateAdmin,
    CreateApplicationForUser,
    CreateOrganization,
    GetAdminApplicationStatus,
    GetAdminLeaderboard,
    GetCurrentUser,
    ListAdminApplications,
    ListAdmins,
    ListOrganizations,
    ListUnappliedStaff,
    ListUsers,
    RefreshSession,
    RegisterAdminApplication,
    RegisterUser,
    RequestPasswordReset,
    ResetPassword,
    ReviewAdminApplication,
    UpdateAdmin,
    UpdateProfile,
)
from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository


class AccountsContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.users = DjangoUserRepository()
        self.hasher = DjangoPasswordHasher()
        self.tokens = JwtTokenService()
        self.admin_applications = DjangoAdminApplicationRepository()
        self.organizations = DjangoOrganizationRepository()
        self.password_reset_codes = DjangoPasswordResetRepository()
        self.password_reset_notifier = DjangoPasswordResetNotifier()
        # Read-only cross-feature access for the owner leaderboard counts.
        self.opportunities = DjangoOpportunityRepository()

    @property
    def register_user(self) -> RegisterUser:
        return RegisterUser(self.users, self.hasher)

    @property
    def apply_for_admin(self) -> ApplyForAdmin:
        return ApplyForAdmin(self.users, self.admin_applications)

    @property
    def register_admin_application(self) -> RegisterAdminApplication:
        return RegisterAdminApplication(self.users, self.hasher, self.admin_applications)

    @property
    def create_application_for_user(self) -> CreateApplicationForUser:
        return CreateApplicationForUser(self.users, self.admin_applications)

    @property
    def list_admin_applications(self) -> ListAdminApplications:
        return ListAdminApplications(self.admin_applications)

    @property
    def list_unapplied_staff(self) -> ListUnappliedStaff:
        return ListUnappliedStaff(self.users)

    @property
    def get_admin_application_status(self) -> GetAdminApplicationStatus:
        return GetAdminApplicationStatus(self.admin_applications)

    @property
    def review_admin_application(self) -> ReviewAdminApplication:
        return ReviewAdminApplication(self.users, self.admin_applications, self.organizations)

    @property
    def create_admin(self) -> CreateAdmin:
        return CreateAdmin(self.users, self.hasher)

    @property
    def list_admins(self) -> ListAdmins:
        return ListAdmins(self.users)

    @property
    def get_admin_leaderboard(self) -> GetAdminLeaderboard:
        return GetAdminLeaderboard(self.users, self.opportunities)

    @property
    def list_users(self) -> ListUsers:
        return ListUsers(self.users)

    @property
    def update_admin(self) -> UpdateAdmin:
        return UpdateAdmin(self.users, self.organizations)

    @property
    def list_organizations(self) -> ListOrganizations:
        return ListOrganizations(self.organizations)

    @property
    def create_organization(self) -> CreateOrganization:
        return CreateOrganization(self.organizations)

    @property
    def authenticate_user(self) -> AuthenticateUser:
        return AuthenticateUser(self.users, self.hasher, self.tokens)

    @property
    def refresh_session(self) -> RefreshSession:
        return RefreshSession(self.users, self.tokens)

    @property
    def get_current_user(self) -> GetCurrentUser:
        return GetCurrentUser(self.users)

    @property
    def update_profile(self) -> UpdateProfile:
        return UpdateProfile(self.users)

    @property
    def request_password_reset(self) -> RequestPasswordReset:
        return RequestPasswordReset(
            self.users,
            self.password_reset_codes,
            self.password_reset_notifier,
            self.hasher,
        )

    @property
    def reset_password(self) -> ResetPassword:
        return ResetPassword(self.users, self.password_reset_codes, self.hasher)


@lru_cache(maxsize=1)
def container() -> AccountsContainer:
    return AccountsContainer()
