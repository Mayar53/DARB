"""Tests for opportunity ownership (admins can only edit/delete their own)
and status-based visibility (published vs hidden) on the public site."""

import pytest
from django.test import Client

from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
from src.accounts.container import container as accounts_container
from src.opportunities.container import container as opportunities_container
from src.opportunities.application.use_cases import OpportunityCommand


def _make_admin(email, full_name):
    user = accounts_container().users.add_admin(
        email=email,
        full_name=full_name,
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
    )
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


def _create_opp(created_by, title="Owned Course"):
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
        created_by=created_by,
    )


@pytest.mark.django_db
def test_owner_can_edit_and_delete_own():
    admin_id = _make_admin("a@example.com", "Admin A")
    client, tokens = _login("a@example.com")
    opp = _create_opp(admin_id)

    updated = client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Renamed"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert updated.status_code == 200, updated.content
    assert updated.json()["title"] == "Renamed"

    deleted = client.delete(f"/api/opportunities/{opp.id}", headers=_h(tokens))
    assert deleted.status_code == 204


@pytest.mark.django_db
def test_other_admin_cannot_edit_or_delete():
    admin_a = _make_admin("a@example.com", "Admin A")
    _make_admin("b@example.com", "Admin B")
    opp = _create_opp(admin_a)

    client, b_tokens = _login("b@example.com")
    updated = client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Hijacked"},
        content_type="application/json",
        headers=_h(b_tokens),
    )
    assert updated.status_code == 403, updated.content

    deleted = client.delete(f"/api/opportunities/{opp.id}", headers=_h(b_tokens))
    assert deleted.status_code == 403

    # Owner can still see it.
    listing = client.get("/api/opportunities/all", headers=_h(b_tokens))
    assert listing.status_code == 200
    assert any(o["id"] == opp.id for o in listing.json())


@pytest.mark.django_db
def test_regular_user_cannot_edit_or_delete():
    admin_a = _make_admin("a@example.com", "Admin A")
    opp = _create_opp(admin_a)
    client = Client()
    reg = client.post(
        "/api/auth/register",
        data={"email": "user@example.com", "password": "supersecret1", "full_name": "User"},
        content_type="application/json",
    )
    assert reg.status_code == 201
    login = client.post(
        "/api/auth/login",
        data={"email": "user@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    u_tokens = login.json()["tokens"]
    assert client.put(
        f"/api/opportunities/{opp.id}",
        data={"title": "Nope"},
        content_type="application/json",
        headers=_h(u_tokens),
    ).status_code == 403
    assert client.delete(f"/api/opportunities/{opp.id}", headers=_h(u_tokens)).status_code == 403


@pytest.mark.django_db
def test_hidden_opportunity_not_public_but_in_dashboard():
    admin_id = _make_admin("a@example.com", "Admin A")
    opp = _create_opp(admin_id)

    client, tokens = _login("a@example.com")
    # Hide it.
    hidden = client.put(
        f"/api/opportunities/{opp.id}",
        data={"status": "hidden"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert hidden.status_code == 200
    assert hidden.json()["status"] == "hidden"
    assert hidden.json()["is_active"] is False

    # Public list no longer shows it.
    pub = client.get("/api/opportunities")
    assert all(o["id"] != opp.id for o in pub.json())

    # Owner's dashboard still shows it.
    dash = client.get("/api/opportunities/dashboard", headers=_h(tokens))
    assert dash.status_code == 200
    body = dash.json()
    assert body["total"] == 1
    assert body["hidden"] == 1
    assert body["visible"] == 0
    assert any(o["id"] == opp.id for o in body["items"])


@pytest.mark.django_db
def test_dashboard_counts_and_owner_scoping():
    admin_a = _make_admin("a@example.com", "Admin A")
    _make_admin("b@example.com", "Admin B")
    _create_opp(admin_a, "A-one")
    _create_opp(admin_a, "A-two")

    client, a_tokens = _login("a@example.com")
    dash = client.get("/api/opportunities/dashboard", headers=_h(a_tokens))
    assert dash.status_code == 200
    body = dash.json()
    assert body["total"] == 2
    assert body["visible"] == 2
    assert all(o["created_by"] == admin_a for o in body["items"])

    # B's dashboard is empty.
    _, b_tokens = _login("b@example.com")
    dash_b = client.get("/api/opportunities/dashboard", headers=_h(b_tokens))
    assert dash_b.json()["total"] == 0


@pytest.mark.django_db
def test_expired_counts_in_dashboard():
    from datetime import date, timedelta
    admin_id = _make_admin("a@example.com", "Admin A")
    opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="course",
            title="Expired One",
            description="Past deadline",
            location="Online",
            mode="online",
            duration="1 day",
            funding="free",
            deadline=date.today() - timedelta(days=3),
            apply_url="https://example.com/apply/old",
        ),
        created_by=admin_id,
    )
    client, tokens = _login("a@example.com")
    dash = client.get("/api/opportunities/dashboard", headers=_h(tokens))
    body = dash.json()
    assert body["total"] == 1
    assert body["expired"] == 1
    assert body["visible"] == 0


@pytest.mark.django_db
def test_mine_endpoint_owner_scoped():
    admin_a = _make_admin("a@example.com", "Admin A")
    _make_admin("b@example.com", "Admin B")
    opp_a = _create_opp(admin_a, "A-only")
    _create_opp(admin_a, "A-two")

    client, a_tokens = _login("a@example.com")
    mine = client.get("/api/opportunities/mine", headers=_h(a_tokens))
    assert mine.status_code == 200
    ids = [o["id"] for o in mine.json()]
    assert opp_a.id in ids
    assert all(o["created_by"] == admin_a for o in mine.json())

    # Regular user -> 403.
    client.post(
        "/api/auth/register",
        data={"email": "user@example.com", "password": "supersecret1", "full_name": "User"},
        content_type="application/json",
    )
    login = client.post(
        "/api/auth/login",
        data={"email": "user@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert client.get("/api/opportunities/mine", headers=_h(login.json()["tokens"])).status_code == 403


# --------------------------------------------------------------------------- #
# Editing must UPDATE the same record (never create a duplicate)
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_edit_keeps_same_id_and_updates_org():
    owner_id = _make_admin("a@example.com", "Admin A")
    client, tokens = _login("a@example.com")
    created = client.post(
        "/api/opportunities",
        data={"category": "course", "title": "Original", "description": "d",
              "location": "Online", "mode": "online", "duration": "1w",
              "funding": "free", "apply_url": "https://example.com/x",
              "status": "published", "organization": "NASA"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert created.status_code == 201, created.content
    opp_id = created.json()["id"]

    # Edit title + org + status via PUT.
    edited = client.put(
        f"/api/opportunities/{opp_id}",
        data={"title": "Renamed", "status": "hidden", "organization": "Student Research Team"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert edited.status_code == 200, edited.content
    assert edited.json()["id"] == opp_id
    assert edited.json()["title"] == "Renamed"
    assert edited.json()["status"] == "hidden"
    assert edited.json()["organization_name"] == "Student Research Team"

    # Exactly one record with the new title.
    all_opps = opportunities_container().repository.list_all(include_inactive=True)
    same_title = [o for o in all_opps if o.title == "Renamed"]
    assert len(same_title) == 1
    assert same_title[0].id == opp_id
