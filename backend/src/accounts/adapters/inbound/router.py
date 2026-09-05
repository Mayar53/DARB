"""Inbound HTTP adapter: the django-ninja router for the accounts feature.

The router is thin — it validates input, delegates to a use case from the
composition root, and lets the domain entities/value objects serialize into the
response schemas (Ninja reads attributes off the returned objects).
"""

from __future__ import annotations

from ninja import Router, Status

from src.accounts.adapters.inbound import schemas as s
from src.accounts.application.use_cases import (
    AdminApplyCommand,
    AdminRegisterCommand,
    AdminUpdateCommand,
    CreateApplicationForUserCommand,
    LoginCommand,
    RegisterCommand,
    ResetPasswordCommand,
    ReviewAdminApplicationCommand,
    UpdateProfileCommand,
)
from src.accounts.container import container
from src.accounts.domain.admin_application import AdminApplicationStatus
from src.accounts.domain.entities import Organization, User
from src.accounts.domain.permissions import (
    MANAGE_ADMIN_APPLICATIONS,
    MANAGE_ADMINS,
    MANAGE_USERS,
    PERMISSION_CATALOG,
    has_permission,
)
from src.shared.domain.exceptions import PermissionDeniedError
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


def _require_owner(request) -> User:
    """Return the caller after verifying they are the OWNER."""
    principal: AuthPrincipal = request.auth
    caller = container().get_current_user.execute(principal.id)
    if caller.role != "owner":
        raise PermissionDeniedError("Owner account required")
    return caller


def _require_permission(request, permission: str) -> User:
    """Return the caller after verifying they have a permission (owner passes)."""
    principal: AuthPrincipal = request.auth
    caller = container().get_current_user.execute(principal.id)
    if not has_permission(caller, permission):
        raise PermissionDeniedError("You do not have permission to do this")
    return caller


@router.post("/register", response={201: s.UserOut})
def register(request, payload: s.RegisterIn):
    user = container().register_user.execute(RegisterCommand(**payload.model_dump()))
    return Status(201, user)


def _optional_principal(request) -> AuthPrincipal | None:
    """Resolve the caller from the Authorization header, or None if absent/invalid."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        return jwt_auth.authenticate(request, header.removeprefix("Bearer ").strip())
    except Exception:
        return None


@router.post("/admin-apply", response={201: s.AdminApplicationOut, 200: s.AdminApplicationOut})
def admin_apply(request, payload: s.AdminApplyIn):
    """Apply for admin access.

    When called by a signed-in user, the application is linked to their
    existing account (no second account is created) and approving it upgrades
    that account in place. When called without a token, the application is
    stored by email and stays visible to the owner, but there is no account to
    upgrade. If the email already has an application, it is returned unchanged
    (no duplicates).
    """
    principal = _optional_principal(request)
    application = container().apply_for_admin.execute(
        AdminApplyCommand(
            **payload.model_dump(),
            user_id=principal.id if principal is not None else None,
        )
    )
    return Status(201, application)


@router.post("/admin-register", response={201: s.AdminApplicationOut, 200: s.AdminApplicationOut})
def admin_register(request, payload: s.AdminRegisterIn):
    """Admin Registration: create a normal account + a PENDING admin request.

    The account is created as a normal user (no admin access) until the OWNER
    approves. Website is optional. If the email already exists, the existing
    account is reused (no duplicate) and a new pending application is created.
    """
    application = container().register_admin_application.execute(
        AdminRegisterCommand(**payload.model_dump())
    )
    return Status(201, application)


@router.get("/my-admin-application", auth=jwt_auth, response=s.AdminApplicationOut | None)
def my_admin_application(request):
    """Return the signed-in user's admin application (or null if none)."""
    principal: AuthPrincipal = request.auth
    app = container().get_admin_application_status.execute_for_user(principal.id)
    return app


@router.post("/admin-application/status", response=s.AdminApplicationStatusOut)
def admin_application_status(request, payload: s.AdminStatusIn):
    """Return the current status of the application for an email (public)."""
    application = container().get_admin_application_status.execute(payload.email)
    return {"status": application.status.value}


# --- OWNER-only admin application review --------------------------------------
@router.get("/permissions", auth=jwt_auth, response=list[s.PermissionOut])
def list_permissions(request):
    """The permission catalog the Owner dashboard renders as checkboxes. OWNER-only."""
    _require_owner(request)
    return [{"key": key, "label": label} for key, label in PERMISSION_CATALOG]


@router.get("/admin-applications", auth=jwt_auth, response=list[s.AdminApplicationOut])
def list_admin_applications(request, request_type: str | None = None):
    """List ALL admin applications (pending, waitlisted, approved).

    Optional ``?request_type=admin|org`` filters by request kind.
    OWNER-only."""
    _require_owner(request)
    return container().list_admin_applications.execute(request_type)


@router.get("/admin-applications/unapplied", auth=jwt_auth, response=list[s.UserOut])
def list_unapplied_staff(request):
    """Staff/admin users who have NO application record (registered/created
    directly). The owner sees them as new applications. OWNER-only."""
    _require_owner(request)
    return container().list_unapplied_staff.execute()


@router.post(
    "/admin-applications/create-for-user",
    auth=jwt_auth,
    response={201: s.AdminApplicationOut, 200: s.AdminApplicationOut},
)
def create_application_for_user(request, payload: s.CreateApplicationForUserIn):
    """Create a pending application record for a user who registered/created an
    account without applying (so the owner can review them). OWNER-only."""
    _require_owner(request)
    app = container().create_application_for_user.execute(
        CreateApplicationForUserCommand(**payload.model_dump())
    )
    return Status(201, app)


@router.post(
    "/admin-applications/{application_id}/approve",
    auth=jwt_auth,
    response=s.AdminApplicationOut,
)
def approve_admin_application(request, application_id: int):
    """Approve an application — upgrades the applicant's existing user account
    to admin in place (same email/password, no second account). OWNER-only."""
    caller = _require_owner(request)
    return container().review_admin_application.execute(
        ReviewAdminApplicationCommand(
            application_id=application_id,
            status=AdminApplicationStatus.APPROVED,
            reviewed_by=caller.id,
        )
    )


@router.post(
    "/admin-applications/{application_id}/waitlist",
    auth=jwt_auth,
    response=s.AdminApplicationOut,
)
def waitlist_admin_application(request, application_id: int):
    """Keep an applicant waitlisted — the user stays a normal user and the
    application stays visible for a later decision. OWNER-only."""
    caller = _require_owner(request)
    return container().review_admin_application.execute(
        ReviewAdminApplicationCommand(
            application_id=application_id,
            status=AdminApplicationStatus.WAITLISTED,
            reviewed_by=caller.id,
        )
    )


@router.post(
    "/admin-applications/{application_id}/pending",
    auth=jwt_auth,
    response=s.AdminApplicationOut,
)
def reopen_admin_application(request, application_id: int):
    """Move a waitlisted application back to Pending for a fresh decision.
    The user stays unchanged. OWNER-only."""
    caller = _require_owner(request)
    return container().review_admin_application.execute(
        ReviewAdminApplicationCommand(
            application_id=application_id,
            status=AdminApplicationStatus.PENDING,
            reviewed_by=caller.id,
        )
    )


@router.post(
    "/admin-applications/{application_id}/decline",
    auth=jwt_auth,
    response=s.AdminApplicationOut,
)
def decline_admin_application(request, application_id: int):
    """Decline an application. The record is kept (status=rejected), the user
    is NOT promoted and stays a normal user. OWNER-only."""
    caller = _require_owner(request)
    return container().review_admin_application.execute(
        ReviewAdminApplicationCommand(
            application_id=application_id,
            status=AdminApplicationStatus.REJECTED,
            reviewed_by=caller.id,
        )
    )


@router.post(
    "/admin-applications/{application_id}/reject",
    auth=jwt_auth,
    response=s.AdminApplicationOut,
)
def reject_admin_application(request, application_id: int):
    """Reject an application. The record is kept (status=rejected), the user
    is NOT promoted and stays a normal user. OWNER-only."""
    caller = _require_owner(request)
    return container().review_admin_application.execute(
        ReviewAdminApplicationCommand(
            application_id=application_id,
            status=AdminApplicationStatus.REJECTED,
            reviewed_by=caller.id,
        )
    )


# --- OWNER-only system management ----------------------------------------------
@router.get("/users", auth=jwt_auth, response=list[s.UserOut])
def list_users(request):
    """List all personal users. OWNER-only."""
    _require_owner(request)
    return container().list_users.execute()


@router.get("/admins", auth=jwt_auth, response=list[s.UserOut])
def list_admins(request):
    """List all admin accounts. OWNER-only."""
    _require_owner(request)
    return container().list_admins.execute()


@router.get("/admins/leaderboard", auth=jwt_auth, response=list[s.AdminLeaderboardEntryOut])
def admin_leaderboard(request):
    """Active admins ranked by their real contribution counts.

    OWNER-only. Counts are computed from the opportunities table — never
    hardcoded. Declared before any /admins/{id} route so the literal path wins.
    """
    _require_owner(request)
    return container().get_admin_leaderboard.execute()


@router.post("/admins", auth=jwt_auth, response={201: s.UserOut})
def create_admin(request, payload: s.RegisterIn):
    """Create an admin account directly. OWNER-only."""
    _require_owner(request)
    return Status(201, container().create_admin.execute(RegisterCommand(**payload.model_dump())))


@router.patch("/admins/{admin_id}", auth=jwt_auth, response=s.UserOut)
def update_admin(request, admin_id: int, payload: s.AdminUpdateIn):
    """Activate/deactivate an admin, change their permissions/orgs. OWNER-only."""
    _require_owner(request)
    return container().update_admin.execute(
        AdminUpdateCommand(
            admin_id=admin_id,
            **payload.model_dump(exclude_unset=True),
        )
    )


@router.get("/organizations", auth=jwt_auth, response=list[s.OrganizationOut])
def list_organizations(request):
    """List organizations/NGOs. OWNER-only."""
    _require_owner(request)
    return container().list_organizations.execute()


@router.post("/organizations", auth=jwt_auth, response={201: s.OrganizationOut})
def create_organization(request, payload: s.OrganizationIn):
    """Create an organization/NGO. OWNER-only."""
    _require_owner(request)
    org = container().create_organization.execute(
        Organization(name=payload.name, website=payload.website, description=payload.description)
    )
    return Status(201, org)


@router.get("/users/{user_id}/public", response=s.PublicProfileOut)
def public_profile(request, user_id: int):
    """A user's public profile (nickname, avatar, points, badges).

    Public — never exposes email, full name, role or permissions. Returns 404
    for inactive accounts.
    """
    user = container().get_current_user.execute(user_id)
    if user is None or not user.is_active:
        from src.shared.domain.exceptions import NotFoundError
        raise NotFoundError("User not found")
    return {
        "id": user.id,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "points": user.points,
        "badges": user.badges,
    }


# --- Personal auth -----------------------------------------------------------
@router.post("/login", response=s.AuthOut)
def login(request, payload: s.LoginIn):
    result = container().authenticate_user.execute(LoginCommand(**payload.model_dump()))
    return {"user": result.user, "tokens": result.tokens}


@router.post("/forgot-password", response={202: dict})
def forgot_password(request, payload: s.ForgotPasswordIn):
    """Request a password reset code for an account (emailed to the user).

    Responds the same whether or not the email exists (no account enumeration).
    """
    container().request_password_reset.execute(payload.email)
    return Status(202, {"detail": "If an account exists, a reset code has been sent."})


@router.post("/reset-password", response={200: dict})
def reset_password(request, payload: s.ResetPasswordIn):
    """Verify the emailed code and set a new password."""
    container().reset_password.execute(
        ResetPasswordCommand(**payload.model_dump())
    )
    return {"detail": "Password has been reset. You can now log in."}


@router.post("/refresh", response=s.TokenOut)
def refresh(request, payload: s.RefreshIn):
    return container().refresh_session.execute(payload.refresh_token)


@router.get("/me", auth=jwt_auth, response=s.UserOut)
def me(request):
    principal: AuthPrincipal = request.auth
    return container().get_current_user.execute(principal.id)


@router.patch("/me", auth=jwt_auth, response=s.UserOut)
def update_me(request, payload: s.ProfileUpdateIn):
    principal: AuthPrincipal = request.auth
    return container().update_profile.execute(
        UpdateProfileCommand(**payload.model_dump(exclude_unset=True)),
        user_id=principal.id,
    )
