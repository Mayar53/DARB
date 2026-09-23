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


# A valid "why do you want to join?" answer — the API requires 10-100 words.
REASON = (
    "I want to help Darb publish more opportunities for students "
    "in my region and my community."
)


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
        data={"email": "mayar@example.com", "full_name": "Mayar", "reason": REASON},
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
        data={"email": "mayar@example.com", "full_name": "Mayar",
              "organization": "Green Iraq", "reason": REASON},
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
def test_owner_leaderboard_shows_views_clicks_and_applications():
    """The owner sees how each admin's opportunities performed — views, apply
    clicks and applications — all counted from real rows, never hardcoded, and
    kept separate per admin.
    """
    _make_owner()
    from src.applied.adapters.outbound.orm_models import AppliedOpportunityModel
    from src.opportunities.adapters.outbound.orm_models import OpportunityModel

    admin_a = _make_admin("a@example.com", "Admin A")
    opp = _create_opp(admin_a, "Viewed Course")
    OpportunityModel.objects.filter(pk=opp.id).update(views=7, apply_clicks=3)

    # Two different users apply to A's opportunity (unique per user+opportunity).
    u1 = accounts_container().users.add(email="u1@example.com", full_name="U1", password_hash="x")
    u2 = accounts_container().users.add(email="u2@example.com", full_name="U2", password_hash="x")
    AppliedOpportunityModel.objects.create(user_id=u1.id, opportunity_id=opp.id)
    AppliedOpportunityModel.objects.create(user_id=u2.id, opportunity_id=opp.id)

    # A second admin's engagement must not bleed into A's numbers.
    admin_b = _make_admin("b@example.com", "Admin B")
    opp_b = _create_opp(admin_b, "Other Course")
    OpportunityModel.objects.filter(pk=opp_b.id).update(views=100, apply_clicks=50)

    client, tokens = _login("boss@example.com")
    board = client.get("/api/auth/admins/leaderboard", headers=_h(tokens))
    assert board.status_code == 200
    entries = {e["admin_id"]: e for e in board.json()}
    a = entries[admin_a]
    assert a["total_opportunities"] == 1
    assert a["total_views"] == 7
    assert a["total_clicks"] == 3
    assert a["total_applications"] == 2
    b = entries[admin_b]
    assert b["total_views"] == 100
    assert b["total_clicks"] == 50
    assert b["total_applications"] == 0

    # Regular admins cannot read the leaderboard at all.
    _, admin_tokens = _login("a@example.com")
    assert client.get("/api/auth/admins/leaderboard", headers=_h(admin_tokens)).status_code == 403


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
            "reason": REASON,
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


@pytest.mark.django_db
def test_owner_can_edit_organization():
    """The owner can fix an NGO's name, website and description. The row used to
    be frozen once created — there was no update path at all."""
    _make_owner()
    client, tokens = _login("boss@example.com")
    created = client.post(
        "/api/auth/organizations",
        data={"name": "Typo NGO", "website": "", "description": ""},
        content_type="application/json",
        headers=_h(tokens),
    )
    org_id = created.json()["id"]

    updated = client.patch(
        f"/api/auth/organizations/{org_id}",
        data={"name": "Fixed NGO", "website": "example.com", "description": "We plant trees."},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert updated.status_code == 200, updated.content
    body = updated.json()
    assert body["name"] == "Fixed NGO"
    assert body["website"] == "https://example.com"  # lenient normaliser
    assert body["description"] == "We plant trees."

    # Junk in the website field is rejected rather than saved as a broken link.
    bad = client.patch(
        f"/api/auth/organizations/{org_id}",
        data={"website": "not a url"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert bad.status_code == 422

    # Renaming onto another NGO's name is a 409, not a crash on the unique index.
    client.post(
        "/api/auth/organizations",
        data={"name": "Other NGO", "website": "", "description": ""},
        content_type="application/json",
        headers=_h(tokens),
    )
    clash = client.patch(
        f"/api/auth/organizations/{org_id}",
        data={"name": "Other NGO"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert clash.status_code == 409

    # A partial edit leaves the fields it did not send alone.
    listing = client.get("/api/auth/organizations", headers=_h(tokens)).json()
    row = next(o for o in listing if o["id"] == org_id)
    assert row["name"] == "Fixed NGO"
    assert row["website"] == "https://example.com"
    assert row["description"] == "We plant trees."

    # Non-owner admins cannot edit.
    _make_admin("edit-denied@example.com")
    _, admin_tokens = _login("edit-denied@example.com")
    denied = client.patch(
        f"/api/auth/organizations/{org_id}",
        data={"name": "Nope"},
        content_type="application/json",
        headers=_h(admin_tokens),
    )
    assert denied.status_code == 403


@pytest.mark.django_db
def test_owner_chooses_whether_an_admin_is_researcher_or_ngo():
    """The owner picks an admin's kind. Because the role is only a label and
    capability comes from permissions, choosing a type applies its defaults."""
    _make_owner()
    from src.accounts.adapters.outbound.orm_models import UserModel

    admin_id = _make_admin("typed@example.com", "Typed Admin")
    client, tokens = _login("boss@example.com")
    owner = _h(tokens)

    as_researcher = client.patch(
        f"/api/auth/admins/{admin_id}",
        data={"role": "researcher"},
        content_type="application/json",
        headers=owner,
    )
    assert as_researcher.status_code == 200, as_researcher.content
    assert as_researcher.json()["role"] == "researcher"
    assert "review_opportunities" in as_researcher.json()["permissions"]

    as_ngo = client.patch(
        f"/api/auth/admins/{admin_id}",
        data={"role": "org_admin"},
        content_type="application/json",
        headers=owner,
    )
    assert as_ngo.status_code == 200, as_ngo.content
    assert as_ngo.json()["role"] == "org_admin"
    assert "manage_own_org_opportunities" in as_ngo.json()["permissions"]
    assert "review_opportunities" not in as_ngo.json()["permissions"]

    # The change survives a fresh login (it is stored, not just echoed).
    _, admin_tokens = _login("typed@example.com")
    me = client.get("/api/auth/me", headers=_h(admin_tokens))
    assert me.json()["role"] == "org_admin"

    # Only the two kinds are assignable — never the OWNER role.
    bad = client.patch(
        f"/api/auth/admins/{admin_id}",
        data={"role": "owner"},
        content_type="application/json",
        headers=owner,
    )
    assert bad.status_code == 422

    # And the OWNER's own account can never be re-typed.
    owner_row = UserModel.objects.get(email="boss@example.com")
    denied = client.patch(
        f"/api/auth/admins/{owner_row.id}",
        data={"role": "researcher"},
        content_type="application/json",
        headers=owner,
    )
    assert denied.status_code == 403


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


@pytest.mark.django_db
def test_publish_payload_from_admin_form_is_accepted():
    """The admin dashboard's create payload round-trips.

    Mirrors the field set the frontend form sends (including organization and
    fields) so a schema/form mismatch surfaces here instead of only in the
    browser, where it shows up as a toast.
    """
    _make_owner()
    client, tokens = _login("boss@example.com")

    created = client.post(
        "/api/opportunities",
        data={
            "category": "scholarship",
            "title": "Form Payload Scholarship",
            "description": "Published from the admin form.",
            "title_ar": None,
            "title_en": None,
            "description_ar": None,
            "description_en": None,
            "location": "",
            "mode": "online",
            "duration": "",
            "funding": "fully-funded",
            "price": "",
            "deadline": None,
            "apply_url": "https://example.com/apply",
            "organization": "Form Payload NGO",
            "organization_website": "https://ngo.example.com",
            "age": "all",
            "certificate": True,
            "verified": False,
            "fields": ["biology"],
        },
        content_type="application/json",
        headers=_h(tokens),
    )
    assert created.status_code == 201, created.content
    body = created.json()
    assert body["status"] == "published"
    assert body["is_active"] is True
    assert body["organization_name"] == "Form Payload NGO"
    assert body["fields"] == ["biology"]

    # A published opportunity is visible on the public listing.
    public = client.get("/api/opportunities")
    assert any(o["id"] == body["id"] for o in public.json())


@pytest.mark.django_db
def test_publish_rejects_unknown_category_with_details():
    """Invalid input is a 422 carrying a details list, never a 500.

    The frontend renders that list, so its shape is part of the contract.
    """
    _make_owner()
    client, tokens = _login("boss@example.com")

    rejected = client.post(
        "/api/opportunities",
        data={"category": "not-a-category", "title": "X", "description": "Y"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert rejected.status_code == 422
    assert isinstance(rejected.json()["detail"], list)


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
