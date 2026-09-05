"""Permission keys, role defaults and the permission catalog (pure Python).

The OWNER always passes every permission check. Admins/researchers/org-admins
have exactly the permissions assigned to them (stored on the user row).
Personal users have none.

The catalog is the single source the Owner dashboard renders as checkboxes —
adding a permission here automatically makes it manageable from the UI.
"""

from __future__ import annotations

# --- Opportunity permissions ------------------------------------------------
VIEW_OPPORTUNITIES = "view_opportunities"
CREATE_OPPORTUNITY = "create_opportunity"
EDIT_OWN_OPPORTUNITY = "edit_own_opportunity"
EDIT_ANY_OPPORTUNITY = "edit_any_opportunity"
DELETE_OWN_OPPORTUNITY = "delete_own_opportunity"
DELETE_ANY_OPPORTUNITY = "delete_any_opportunity"
HIDE_OWN_OPPORTUNITY = "hide_own_opportunity"
HIDE_ANY_OPPORTUNITY = "hide_any_opportunity"
PUBLISH_OPPORTUNITIES = "publish_opportunities"
REVIEW_OPPORTUNITIES = "review_opportunities"
MANAGE_OWN_ORG_OPPORTUNITIES = "manage_own_org_opportunities"
MANAGE_ASSIGNED_NGO = "manage_assigned_ngo"

# --- Users / admins -----------------------------------------------------------
VIEW_USERS = "view_users"
MANAGE_USERS = "manage_users"
VIEW_ADMIN_APPLICATIONS = "view_admin_applications"
APPROVE_ADMIN_APPLICATIONS = "approve_admin_applications"
MANAGE_ADMINS = "manage_admins"
EDIT_ADMIN_PERMISSIONS = "edit_admin_permissions"

# --- Organizations / reports --------------------------------------------------
MANAGE_ORGANIZATIONS = "manage_organizations"
VIEW_REPORTS = "view_reports"

# Full catalog — every permission an Owner can toggle in the dashboard.
PERMISSION_CATALOG: tuple[tuple[str, str], ...] = (
    (VIEW_OPPORTUNITIES, "View opportunities"),
    (CREATE_OPPORTUNITY, "Create opportunities"),
    (EDIT_OWN_OPPORTUNITY, "Edit own opportunities"),
    (EDIT_ANY_OPPORTUNITY, "Edit all opportunities"),
    (DELETE_OWN_OPPORTUNITY, "Delete own opportunities"),
    (DELETE_ANY_OPPORTUNITY, "Delete all opportunities"),
    (HIDE_OWN_OPPORTUNITY, "Hide own opportunities"),
    (HIDE_ANY_OPPORTUNITY, "Hide all opportunities"),
    (PUBLISH_OPPORTUNITIES, "Publish opportunities"),
    (REVIEW_OPPORTUNITIES, "Review opportunities"),
    (MANAGE_OWN_ORG_OPPORTUNITIES, "Manage own organization opportunities"),
    (MANAGE_ASSIGNED_NGO, "Manage assigned NGO"),
    (VIEW_USERS, "View users"),
    (MANAGE_USERS, "Manage users"),
    (VIEW_ADMIN_APPLICATIONS, "View admin applications"),
    (APPROVE_ADMIN_APPLICATIONS, "Approve admin applications"),
    (MANAGE_ADMINS, "Manage admins"),
    (EDIT_ADMIN_PERMISSIONS, "Edit admin permissions"),
    (MANAGE_ORGANIZATIONS, "Manage organizations"),
    (VIEW_REPORTS, "View reports/statistics"),
)

ALL_PERMISSIONS: tuple[str, ...] = tuple(key for key, _ in PERMISSION_CATALOG)

# What a newly approved research/opportunity admin can do out of the box. The
# OWNER can change this later from the Admins management section.
DEFAULT_RESEARCHER_PERMISSIONS: list[str] = [
    VIEW_OPPORTUNITIES,
    CREATE_OPPORTUNITY,
    EDIT_OWN_OPPORTUNITY,
    DELETE_OWN_OPPORTUNITY,
    HIDE_OWN_OPPORTUNITY,
    REVIEW_OPPORTUNITIES,
]

# What a newly approved organization admin can do out of the box.
DEFAULT_ORG_ADMIN_PERMISSIONS: list[str] = [
    VIEW_OPPORTUNITIES,
    CREATE_OPPORTUNITY,
    EDIT_OWN_OPPORTUNITY,
    HIDE_OWN_OPPORTUNITY,
    MANAGE_OWN_ORG_OPPORTUNITIES,
]

# Kept for compatibility with existing callers (the generic "admin" role).
DEFAULT_ADMIN_PERMISSIONS: list[str] = DEFAULT_RESEARCHER_PERMISSIONS

# The OWNER has every permission.
OWNER_PERMISSIONS: list[str] = list(ALL_PERMISSIONS)

# Backward-compatible key used by the router to gate application review
# (the catalog exposes the finer-grained view/approve permissions).
MANAGE_ADMIN_APPLICATIONS = "manage_admin_applications"


def permission_label(key: str) -> str:
    for k, label in PERMISSION_CATALOG:
        if k == key:
            return label
    return key


def has_permission(user, permission: str) -> bool:
    """Backend authorization check — the single source of truth.

    ``user`` is the accounts domain ``User`` (has ``role`` + ``permissions``).
    OWNER always passes; admins pass only with the assigned permission;
    everyone else is denied.
    """
    role = getattr(user, "role", "user")
    if role == "owner":
        return True
    if role in ("admin", "researcher", "org_admin"):
        return permission in (getattr(user, "permissions", None) or [])
    return False
