"""
Application use cases for the accounts feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from secrets import randbelow

from src.accounts.domain.admin_application import AdminApplication, AdminApplicationStatus
from src.accounts.domain.entities import Organization, TokenPair, User
from src.accounts.domain.exceptions import (
    ApplicationNotApproved,
    ApplicationNotFound,
    EmailAlreadyUsed,
    InvalidCredentials,
    ResetCodeInvalid,
    UserNotFound,
)
from src.accounts.domain.permissions import (
    DEFAULT_ORG_ADMIN_PERMISSIONS,
    DEFAULT_RESEARCHER_PERMISSIONS,
)
from src.accounts.domain.ports import (
    AdminApplicationRepository,
    OrganizationRepository,
    PasswordHasher,
    PasswordResetNotifier,
    PasswordResetRepository,
    TokenService,
    UserRepository,
)
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import PermissionDeniedError


# --------------------------------------------------------------------------- #
# Commands / results (application DTOs, framework-free)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class RegisterCommand:
    email: str
    password: str
    full_name: str
    nickname: str = ""
    permissions: list[str] | None = None


@dataclass(frozen=True)
class LoginCommand:
    email: str
    password: str


@dataclass(frozen=True)
class AuthResult:
    user: User
    tokens: TokenPair


@dataclass(frozen=True)
class AdminApplyCommand:
    email: str
    full_name: str
    organization: str = ""
    website: str = ""
    position: str = ""
    reason: str = ""
    user_id: int | None = None
    request_type: str = "admin"  # "admin" (researcher) | "org" (organization admin)


@dataclass(frozen=True)
class AdminRegisterCommand:
    """Admin Registration form — creates an account AND a pending request.

    The account is created as a normal user (role=user, is_staff=False) so the
    person has NO admin access until the OWNER approves. The linked application
    starts pending.
    """

    email: str
    password: str
    full_name: str
    nickname: str = ""
    organization: str = ""
    website: str = ""
    request_type: str = "admin"  # "admin" (researcher) | "org" (organization admin)


@dataclass(frozen=True)
class ReviewAdminApplicationCommand:
    application_id: int
    status: AdminApplicationStatus
    reviewed_by: int


@dataclass(frozen=True)
class AdminUpdateCommand:
    admin_id: int
    is_active: bool | None = None
    permissions: list[str] | None = None
    organization_ids: list[int] | None = None


def _normalize_email(email: str) -> str:
    return email.strip().lower()


# --------------------------------------------------------------------------- #
# Use cases
# --------------------------------------------------------------------------- #
class RegisterUser(UseCase[RegisterCommand, User]):
    """Create a regular personal account. Registration never grants admin."""

    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    def execute(self, data: RegisterCommand) -> User:
        email = _normalize_email(data.email)
        if self._users.exists_by_email(email):
            raise EmailAlreadyUsed()

        password_hash = self._hasher.hash(data.password)
        return self._users.add(
            email=email,
            full_name=data.full_name.strip(),
            nickname=data.nickname.strip(),
            password_hash=password_hash,
        )


class ApplyForAdmin(UseCase[AdminApplyCommand, AdminApplication]):
    """Create an admin application for an existing user (or return the current one).

    The applicant must already have a normal account (no second account is
    created). The application is linked to that account via ``user_id``. If the
    user already has an application in any state, it is returned unchanged — no
    duplicate application records are created.
    """

    def __init__(
        self,
        users: UserRepository,
        applications: AdminApplicationRepository,
    ) -> None:
        self._users = users
        self._applications = applications

    def execute(self, data: AdminApplyCommand) -> AdminApplication:
        email = _normalize_email(data.email)
        user = self._users.get_by_email(email)
        if user is None:
            raise UserNotFound("No account found for this email — register a normal account first")

        # Existing application (any status) is returned as-is; the owner may
        # re-review waitlisted ones later, and approved ones keep their state.
        existing = self._applications.get_by_email(email)
        if existing is not None:
            return existing

        return self._applications.create(
            email=email,
            full_name=(data.full_name or user.full_name).strip(),
            organization=data.organization,
            website=data.website,
            position=data.position,
            reason=data.reason,
            user_id=user.id,
            request_type=data.request_type,
        )


class RegisterAdminApplication(UseCase[AdminRegisterCommand, AdminApplication]):
    """Admin Registration: create a normal account + a pending admin request.

    The user account is created with role=user and is_staff=False — they have
    NO admin access until the OWNER approves the linked application. If the
    email already exists (an existing general user), no duplicate account is
    created; their existing account is linked to a new pending application.
    """

    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher,
        applications: AdminApplicationRepository,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._applications = applications

    def execute(self, data: AdminRegisterCommand) -> AdminApplication:
        email = _normalize_email(data.email)

        # Reuse an existing account if present (never create a duplicate).
        user = self._users.get_by_email(email)
        if user is None:
            password_hash = self._hasher.hash(data.password)
            user = self._users.add(
                email=email,
                full_name=data.full_name.strip(),
                nickname=data.nickname.strip(),
                password_hash=password_hash,
            )

        # If they already have an application, return it unchanged.
        existing = self._applications.get_by_email(email)
        if existing is not None:
            return existing

        return self._applications.create(
            email=email,
            full_name=(data.full_name or user.full_name).strip(),
            organization=data.organization,
            website=data.website,
            user_id=user.id,
            request_type=data.request_type,
        )


@dataclass(frozen=True)
class CreateApplicationForUserCommand:
    user_id: int
    request_type: str = "admin"


class CreateApplicationForUser(UseCase[CreateApplicationForUserCommand, AdminApplication]):
    """Create a pending application record for a user (OWNER-only).

    Used when a staff/admin user registered or was created without going
    through the application flow — the OWNER brings them into the review list.
    If the user already has an application, it is returned unchanged.
    """

    def __init__(
        self,
        users: UserRepository,
        applications: AdminApplicationRepository,
    ) -> None:
        self._users = users
        self._applications = applications

    def execute(self, data: CreateApplicationForUserCommand) -> AdminApplication:
        user = self._users.get_by_id(data.user_id)
        if user is None:
            raise UserNotFound()

        existing = self._applications.get_by_user_id(user.id)
        if existing is not None:
            return existing

        return self._applications.create(
            email=user.email,
            full_name=user.full_name,
            user_id=user.id,
            request_type=data.request_type,
        )


class ListAdminApplications(UseCase[str | None, list[AdminApplication]]):
    """Return ALL applications (pending, waitlisted, approved) for the owner.

    ``request_type`` filters: "admin" (researchers), "org" (organization
    admins), or None for everything.
    """

    def __init__(self, applications: AdminApplicationRepository) -> None:
        self._applications = applications

    def execute(self, request_type: str | None = None) -> list[AdminApplication]:
        return self._applications.list_all(request_type=request_type)


class ListUnappliedStaff(UseCase[None, list[User]]):
    """Staff/admin users who never submitted an application.

    These surface to the OWNER as new applications (registered/created without
    the application flow) so the owner can formally approve, decline or
    waitlist them.
    """

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, _data: None = None) -> list[User]:
        return self._users.list_staff_without_application()


class GetAdminApplicationStatus(UseCase[str, AdminApplication]):
    """Return the application for an email (for status lookup)."""

    def __init__(self, applications: AdminApplicationRepository) -> None:
        self._applications = applications

    def execute(self, email: str) -> AdminApplication:
        application = self._applications.get_by_email(_normalize_email(email))
        if application is None:
            raise ApplicationNotFound()
        return application

    def execute_for_user(self, user_id: int) -> AdminApplication | None:
        """Return the application for a signed-in user (or None if none)."""
        return self._applications.get_by_user_id(user_id)


class ReviewAdminApplication(UseCase[ReviewAdminApplicationCommand, AdminApplication]):
    """Owner review of an admin application.

    ``APPROVED`` upgrades the applicant's existing account to the appropriate
    admin role in place — same email, same password, no second account.
    A "researcher" request becomes role ``admin``/``researcher`` with the
    researcher permissions; an "organization" request becomes role
    ``org_admin`` with the org-admin permissions, and the named organization is
    created/linked so the org admin can publish under it.
    ``WAITLISTED`` keeps the application open and the user unchanged, so the
    owner can approve later. Nothing is ever permanently deleted.
    """

    def __init__(
        self,
        users: UserRepository,
        applications: AdminApplicationRepository,
        organizations: OrganizationRepository,
    ) -> None:
        self._users = users
        self._applications = applications
        self._organizations = organizations

    def execute(self, data: ReviewAdminApplicationCommand) -> AdminApplication:
        application = self._applications.get_by_id(data.application_id)
        if application is None:
            raise ApplicationNotFound()

        if data.status == AdminApplicationStatus.APPROVED:
            if application.user_id is None:
                raise ApplicationNotApproved(
                    "This application has no linked account and cannot be approved in place"
                )
            user = self._users.get_by_id(application.user_id)
            if user is None:
                raise UserNotFound("The applicant account no longer exists")

            if application.request_type == "org":
                role = "org_admin"
                permissions = DEFAULT_ORG_ADMIN_PERMISSIONS
            else:
                role = "admin"
                permissions = DEFAULT_RESEARCHER_PERMISSIONS
            self._users.set_role(user.id, role=role, permissions=permissions)

            # Organization admins get their named organization created + linked.
            org_name = (application.organization or "").strip()
            if application.request_type == "org" and org_name:
                org = self._organizations.create(
                    name=org_name,
                    website=application.website,
                    description=application.reason,
                )
                self._users.assign_organization(user.id, org.id)

        application = self._applications.set_status(
            data.application_id,
            status=data.status,
            reviewed_by=data.reviewed_by,
        )
        if application is None:
            raise ApplicationNotFound()
        return application


class AuthenticateUser(UseCase[LoginCommand, AuthResult]):
    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._tokens = tokens

    def execute(self, data: LoginCommand) -> AuthResult:
        user = self._users.get_by_email(_normalize_email(data.email))
        if (
            user is None
            or not user.is_active
            or not self._hasher.verify(data.password, user.password_hash or "")
        ):
            raise InvalidCredentials()
        return AuthResult(user=user, tokens=self._tokens.issue(user))


class RefreshSession(UseCase[str, TokenPair]):
    def __init__(self, users: UserRepository, tokens: TokenService) -> None:
        self._users = users
        self._tokens = tokens

    def execute(self, refresh_token: str) -> TokenPair:
        user_id = self._tokens.subject_from_refresh(refresh_token)
        user = self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidCredentials("User is no longer active")
        return self._tokens.issue(user)


class GetCurrentUser(UseCase[int, User]):
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, user_id: int) -> User:
        user = self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFound()
        return user


class CreateAdmin(UseCase[RegisterCommand, User]):
    """Creates an admin account directly. OWNER-only (router gate)."""

    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    def execute(self, data: RegisterCommand) -> User:
        email = _normalize_email(data.email)
        if self._users.exists_by_email(email):
            raise EmailAlreadyUsed()
        password_hash = self._hasher.hash(data.password)
        return self._users.add_admin(
            email=email,
            full_name=data.full_name.strip(),
            nickname=data.nickname.strip(),
            password_hash=password_hash,
            permissions=data.permissions,
        )


class ListAdmins(UseCase[None, list[User]]):
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, _data: None = None) -> list[User]:
        return self._users.list_admins()


@dataclass(frozen=True)
class AdminLeaderboardEntry:
    admin_id: int
    admin_name: str = ""
    nickname: str = ""
    avatar: str = ""
    total_opportunities: int = 0
    active_opportunities: int = 0
    opportunities: list[dict] = field(default_factory=list)


class GetAdminLeaderboard(UseCase[None, list[AdminLeaderboardEntry]]):
    """Active admins ranked by their real contribution counts.

    Owner-only (router gate). Counts come from the opportunities repository —
    never hardcoded. "Active" = status == "published" and deadline not passed.
    """

    def __init__(
        self,
        users: UserRepository,
        opportunities: "OpportunityRepository",
    ) -> None:
        self._users = users
        self._opportunities = opportunities

    def execute(self, _data: None = None) -> list[AdminLeaderboardEntry]:
        from datetime import date as _date

        today = _date.today()
        admins = [a for a in self._users.list_admins() if a.is_active]
        entries: list[AdminLeaderboardEntry] = []
        for admin in admins:
            opps = self._opportunities.list_by_owner(admin.id)
            active = [
                o
                for o in opps
                if o.status == "published" and (o.deadline is None or o.deadline >= today)
            ]
            entries.append(
                AdminLeaderboardEntry(
                    admin_id=admin.id,
                    admin_name=admin.full_name or admin.nickname or admin.email,
                    nickname=admin.nickname,
                    avatar=admin.avatar,
                    total_opportunities=len(opps),
                    active_opportunities=len(active),
                    opportunities=[
                        {"id": o.id, "title": o.title}
                        for o in sorted(opps, key=lambda x: x.created_at, reverse=True)
                    ][:50],
                )
            )
        # Rank by total submissions, then active, then name.
        entries.sort(
            key=lambda e: (-e.total_opportunities, -e.active_opportunities, e.admin_name.lower())
        )
        return entries


class ListUsers(UseCase[None, list[User]]):
    """List every registered personal user (OWNER: manage_users)."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, _data: None = None) -> list[User]:
        return self._users.list_users()


class UpdateAdmin(UseCase[AdminUpdateCommand, User]):
    """OWNER management of an admin: activate/deactivate, permissions, orgs."""

    def __init__(self, users: UserRepository, organizations: OrganizationRepository) -> None:
        self._users = users
        self._organizations = organizations

    def execute(self, data: AdminUpdateCommand) -> User:
        user = self._users.get_by_id(data.admin_id)
        if user is None:
            raise UserNotFound()
        if user.role == "owner":
            raise PermissionDeniedError("Cannot modify the OWNER account")

        updated = self._users.update_admin(
            user.id,
            is_active=data.is_active,
            permissions=data.permissions,
        )
        if data.organization_ids is not None:
            org_ids = []
            for org_id in data.organization_ids:
                org = self._organizations.get_by_id(org_id)
                if org is not None:
                    org_ids.append(org.id)
            self._users.set_organizations(user.id, org_ids)
        if updated is None:
            raise UserNotFound()
        return updated


class ListOrganizations(UseCase[None, list[Organization]]):
    def __init__(self, organizations: OrganizationRepository) -> None:
        self._organizations = organizations

    def execute(self, _data: None = None) -> list[Organization]:
        return self._organizations.list_all()


class CreateOrganization(UseCase[Organization, Organization]):
    def __init__(self, organizations: OrganizationRepository) -> None:
        self._organizations = organizations

    def execute(self, data: Organization) -> Organization:
        return self._organizations.create(
            name=data.name,
            website=data.website,
            description=data.description,
        )


@dataclass(frozen=True)
class UpdateProfileCommand:
    nickname: str | None = None
    avatar: str | None = None


class UpdateProfile(UseCase[UpdateProfileCommand, User]):
    """Update the caller's own nickname/avatar."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, data: UpdateProfileCommand, *, user_id: int) -> User:
        user = self._users.update_profile(
            user_id,
            nickname=data.nickname.strip() if data.nickname is not None else None,
            avatar=data.avatar.strip() if data.avatar is not None else None,
        )
        if user is None:
            raise UserNotFound()
        return user


# --------------------------------------------------------------------------- #
# Password reset (self-service recovery)
# --------------------------------------------------------------------------- #
def _generate_code() -> str:
    """A 6-digit numeric code (cryptographically random)."""
    return f"{randbelow(1_000_000):06d}"


class RequestPasswordReset(UseCase[str, None]):
    """Issue a reset code for an existing account and email it to the user.

    If the email has no account, nothing is sent and no code is stored — the
    endpoint responds identically either way so the flow does not leak which
    emails are registered.
    """

    CODE_TTL = timedelta(minutes=30)

    def __init__(
        self,
        users: UserRepository,
        codes: PasswordResetRepository,
        notifier: PasswordResetNotifier,
        hasher: PasswordHasher,
    ) -> None:
        self._users = users
        self._codes = codes
        self._notifier = notifier
        self._hasher = hasher

    def execute(self, email: str) -> None:
        email = _normalize_email(email)
        if self._users.get_by_email(email) is None:
            return  # no account — behave identically to avoid enumeration

        code = _generate_code()
        self._codes.invalidate_for_email(email)
        self._codes.create(
            email=email,
            code_hash=self._hasher.hash(code),
            expires_at=datetime.now(UTC) + self.CODE_TTL,
        )
        self._notifier.send_code(email=email, code=code)


@dataclass(frozen=True)
class ResetPasswordCommand:
    email: str
    code: str
    new_password: str


class ResetPassword(UseCase[ResetPasswordCommand, None]):
    """Verify the emailed code and set a new password for the account.

    The code is single-use: a successful reset marks it used. Expired or
    already-used codes are rejected.
    """

    def __init__(
        self,
        users: UserRepository,
        codes: PasswordResetRepository,
        hasher: PasswordHasher,
    ) -> None:
        self._users = users
        self._codes = codes
        self._hasher = hasher

    def execute(self, data: ResetPasswordCommand) -> None:
        email = _normalize_email(data.email)
        user = self._users.get_by_email(email)
        if user is None:
            raise ResetCodeInvalid()

        record = self._codes.get_latest(email)
        if (
            record is None
            or record.used
            or record.expires_at is None
            or record.expires_at < datetime.now(UTC)
            or not self._hasher.verify(data.code, record.code_hash)
        ):
            raise ResetCodeInvalid()

        self._users.update_password(user.id, data.new_password)
        self._codes.mark_used(record.id)
        self._codes.invalidate_for_email(email)
