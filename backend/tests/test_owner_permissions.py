"""Tests for the OWNER + ADMIN + PERMISSIONS architecture:
role storage, owner-only gates, permission enforcement, organizations, and
the promote_owner bootstrap command."""

import io

import pytest
from django.core.management import call_command
from django.test import Client

from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
from src.accounts.container import container as accounts_container
from src.accounts.domain.permissions import (
    DEFAULT_ADMIN_PERMISSIONS,
    DELETE_ANY_OPPORTUNITY,
    EDIT_ANY_OPPORTUNITY,
    HIDE_ANY_OPPORTUNITY,
    OWNER_PERMISSIONS,
)
from src.opportunities.container import container as opportunities_container
from src.opportunities.application.use_cases import OpportunityCommand


def _make_admin(email, full_name="Admin", permissions=None):
    user = accounts_container().users.add_admin(
        email=email,
        full_name=full_name,
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
        permissions=permissions,
    )
    return user.id


def _make_owner(email="boss@example.com", full_name="Boss"):
    user = accounts_container().users.add_admin(
        email=email,
        full_name=full_name,
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
    )
    accounts_container().users.set_role(user.id, role="owner", permissions=OWNER_PERMISSIONS)
    return user.id


def _login(email):
    client = Client()
    login = client.post(
        "/api/auth/login",
        data={"email": email, "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return client, login.json()["tokens"]


def _h(tokens): return {"Authorization": f"Bearer {tokens['access_token']}"}


def _create_opp(owner_id, title="Owned Course"):
    return opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="course",
            title=title,
            description="A test course",
            location="Online",
            mode="online",
            duration="2 weeks",
            funding="free",
            apply_url="https://example.com/apply/course",
        ),
        created_by=owner_id,
    )


# --------------------------------------------------------------------------- #
# promote_owner command
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_promote_owner_makes_existing_account_owner():
    accounts_container().register_user.execute(
        type("RegisterCommand", (), {"email": "me@example.com", "password": "x", "full_name": "Me", "nickname": ""})()
    )
    out = io.StringIO()
    call_command("promote_owner", "me@example.com", stdout=out)

    from src.accounts.adapters.outbound.orm_models import UserModel
    user = UserModel.objects.get(email="me@example.com")
    assert user.role == "owner"
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.permissions == OWNER_PERMISSIONS


@pytest.mark.django_db
def test_promote_owner_refuses_second_owner():
    _make_owner("boss@example.com")
    accounts_container().register_user.execute(
        type("RegisterCommand", (), {"email": "me@example.com", "password": "x", "full_name": "Me", "nickname": ""})()
    )
    with pytest.raises(Exception):
        call_command("promote_owner", "me@example.com")


@pytest.mark.django_db
def test_promote_owner_requires_existing_account():
    with pytest.raises(Exception):
        call_command("promote_owner", "nobody@example.com")


# --------------------------------------------------------------------------- #
# Role + owner-only gates
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_regular_admin_cannot_review_applications():
    _make_owner()
    _make_admin("admin1@example.com")
    # a normal user applies (linked to their account)
    client = Client()
    client.post(
        "/api/auth/register",
        data={"email": "mayar@example.com", "password": "supersecret1", "full_name": "Mayar"},
        content_type="application/json",
    )
    login = client.post(
        "/api/auth/login",
        data={"email": "mayar@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    user_headers = _h(login.json()["tokens"])
    client.post(
        "/api/auth/admin-apply",
        data={"email": "mayar@example.com", "full_name": "Mayar", "reason": "x"},
        content_type="application/json",
        headers=user_headers,
    )
    _, admin_tokens = _login("admin1@example.com")
    assert client.get("/api/auth/admin-applications", headers=_h(admin_tokens)).status_code == 403
    assert client.post(
        "/api/auth/admin-applications/1/approve", headers=_h(admin_tokens)
    ).status_code == 403


@pytest.mark.django_db
def test_owner_can_review_applications():
    _make_owner()
    client = Client()
    client.post(
        "/api/auth/register",
        data={"email": "mayar@example.com", "password": "supersecret1", "full_name": "Mayar"},
        content_type="application/json",
    )
    login = client.post(
        "/api/auth/login",
        data={"email": "mayar@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    user_headers = _h(login.json()["tokens"])
    client.post(
        "/api/auth/admin-apply",
        data={"email": "mayar@example.com", "full_name": "Mayar", "organization": "Green Iraq", "reason": "x"},
        content_type="application/json",
        headers=user_headers,
    )
    _, owner_tokens = _login("boss@example.com")
    listing = client.get("/api/auth/admin-applications", headers=_h(owner_tokens))
    assert listing.status_code == 200
    app_id = listing.json()[0]["id"]
    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"


@pytest.mark.django_db
def test_owner_can_manage_admins_and_users():
    _make_owner()
    _make_admin("admin1@example.com")
    client, tokens = _login("boss@example.com")
    assert client.get("/api/auth/admins", headers=_h(tokens)).status_code == 200
    assert client.get("/api/auth/users", headers=_h(tokens)).status_code == 200
    assert client.get("/api/auth/organizations", headers=_h(tokens)).status_code == 200


@pytest.mark.django_db
def test_regular_admin_cannot_manage_admins():
    _make_owner()
    _make_admin("admin1@example.com")
    client, admin_tokens = _login("admin1@example.com")
    assert client.get("/api/auth/admins", headers=_h(admin_tokens)).status_code == 403
    assert client.get("/api/auth/users", headers=_h(admin_tokens)).status_code == 403


@pytest.mark.django_db
def test_owner_can_activate_deactivate_and_set_permissions():
    owner_id = _make_owner()
    admin_id = _make_admin("admin1@example.com")
    client, tokens = _login("boss@example.com")

    # Deactivate
    updated = client.patch(
        f"/api/auth/admins/{admin_id}",
        data={"is_active": False},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False

    # Set permissions
    updated2 = client.patch(
        f"/api/auth/admins/{admin_id}",
        data={"permissions": ["create_opportunity"]},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert updated2.status_code == 200
    assert updated2.json()["permissions"] == ["create_opportunity"]


# --------------------------------------------------------------------------- #
# Permission enforcement on opportunities
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_admin_cannot_edit_others_without_permission():
    owner_id = _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A")  # default perms (own only)
    _make_admin("b@example.com", "Admin B")
    opp = _create_opp(admin_a)

    client, b_tokens = _login("b@example.com")
    assert client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Hijacked"},
        content_type="application/json",
        headers=_h(b_tokens),
    ).status_code == 403
    assert client.delete(f"/api/opportunities/{opp.id}", headers=_h(b_tokens)).status_code == 403


@pytest.mark.django_db
def test_admin_with_edit_any_can_edit_others():
    _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A")
    _make_admin("b@example.com", "Admin B", permissions=[EDIT_ANY_OPPORTUNITY, DELETE_ANY_OPPORTUNITY])
    opp = _create_opp(admin_a)

    client, b_tokens = _login("b@example.com")
    updated = client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Moderated"},
        content_type="application/json",
        headers=_h(b_tokens),
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Moderated"
    assert client.delete(f"/api/opportunities/{opp.id}", headers=_h(b_tokens)).status_code == 204


@pytest.mark.django_db
def test_owner_can_edit_any_opportunity():
    owner_id = _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A")
    opp = _create_opp(admin_a)

    client, tokens = _login("boss@example.com")
    updated = client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Owner edited"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Owner edited"


# --------------------------------------------------------------------------- #
# Organizations
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_org_created_from_application_on_register():
    _make_owner()
    client = Client()
    client.post(
        "/api/auth/register",
        data={"email": "mayar@example.com", "password": "supersecret1", "full_name": "Mayar Ali"},
        content_type="application/json",
    )
    login = client.post(
        "/api/auth/login",
        data={"email": "mayar@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    user_headers = _h(login.json()["tokens"])
    client.post(
        "/api/auth/admin-apply",
        data={
            "email": "mayar@example.com",
            "full_name": "Mayar Ali",
            "organization": "Green Iraq",
            "website": "https://greeniraq.example",
            "position": "Coordinator",
            "reason": "We plant trees",
        },
        content_type="application/json",
        headers=user_headers,
    )
    _, owner_tokens = _login("boss@example.com")
    app_id = client.get("/api/auth/admin-applications", headers=_h(owner_tokens)).json()[0]["id"]
    approved = client.post(f"/api/auth/admin-applications/{app_id}/approve", headers=_h(owner_tokens))
    assert approved.status_code == 200

    # The existing user is upgraded in place — no second account, no admin-register.
    from src.accounts.adapters.outbound.orm_models import UserModel
    users = list(UserModel.objects.filter(email="mayar@example.com"))
    assert len(users) == 1
    assert users[0].role == "admin"
    assert users[0].is_staff is True


@pytest.mark.django_db
def test_owner_can_create_organization():
    _make_owner()
    client, tokens = _login("boss@example.com")
    created = client.post(
        "/api/auth/organizations",
        data={"name": "New NGO", "website": "https://ngonew.example", "description": "d"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert created.status_code == 201
    assert created.json()["name"] == "New NGO"


# --------------------------------------------------------------------------- #
# Opportunity statuses
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_draft_and_archived_not_public():
    owner_id = _make_owner()
    client, tokens = _login("boss@example.com")
    draft = client.post(
        "/api/opportunities",
        data={"category": "course", "title": "Draft Opp", "description": "d", "apply_url": "https://x.example", "status": "draft"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert draft.status_code == 201
    assert draft.json()["status"] == "draft"

    pub = client.get("/api/opportunities")
    assert all(o["id"] != draft.json()["id"] for o in pub.json())

    # Owner can see it in their dashboard.
    dash = client.get("/api/opportunities/dashboard", headers=_h(tokens))
    assert any(o["id"] == draft.json()["id"] for o in dash.json()["items"])


# --------------------------------------------------------------------------- #
# Hide permission rules
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_admin_without_hide_permission_cannot_hide_own():
    _make_owner()
    # Admin with edit_own but WITHOUT hide_own.
    admin_id = _make_admin("a@example.com", "Admin A", permissions=["edit_own_opportunity", "delete_own_opportunity"])
    opp = _create_opp(admin_id)
    client, tokens = _login("a@example.com")
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert hidden.status_code == 403


@pytest.mark.django_db
def test_admin_with_hide_own_can_hide_own():
    _make_owner()
    admin_id = _make_admin("a@example.com", "Admin A", permissions=["edit_own_opportunity", "hide_own_opportunity"])
    opp = _create_opp(admin_id)
    client, tokens = _login("a@example.com")
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert hidden.status_code == 200
    assert hidden.json()["status"] == "hidden"


@pytest.mark.django_db
def test_admin_with_hide_own_cannot_hide_others():
    _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A", permissions=["edit_own_opportunity", "hide_own_opportunity"])
    _make_admin("b@example.com", "Admin B", permissions=["edit_own_opportunity", "hide_own_opportunity"])
    opp = _create_opp(admin_a)
    client, b_tokens = _login("b@example.com")
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(b_tokens),
    )
    assert hidden.status_code == 403


@pytest.mark.django_db
def test_admin_with_hide_any_can_hide_any():
    _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A")
    _make_admin("b@example.com", "Admin B", permissions=["edit_own_opportunity", "hide_any_opportunity"])
    opp = _create_opp(admin_a)
    client, b_tokens = _login("b@example.com")
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(b_tokens),
    )
    assert hidden.status_code == 200
    assert hidden.json()["status"] == "hidden"


@pytest.mark.django_db
def test_owner_can_hide_any():
    owner_id = _make_owner()
    admin_a = _make_admin("a@example.com", "Admin A")
    opp = _create_opp(admin_a)
    client, tokens = _login("boss@example.com")
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert hidden.status_code == 200
    assert hidden.json()["status"] == "hidden"
