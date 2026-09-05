"""End-to-end tests for the applied feature + privacy + analytics updates."""

import pytest
from django.test import Client

from src.opportunities.application.use_cases import OpportunityCommand
from src.opportunities.container import container as opportunities_container


def _ensure_admin():
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    from src.accounts.container import container as accounts_container
    from src.accounts.adapters.outbound.orm_models import UserModel
    admin = UserModel.objects.filter(email="boss@example.com").first()
    if admin is None:
        accounts_container().users.add_admin(
            email="boss@example.com",
            full_name="Boss Admin",
            password_hash=DjangoPasswordHasher().hash("supersecret1"),
        )
    return UserModel.objects.get(email="boss@example.com").id


@pytest.fixture
def opp():
    admin_id = _ensure_admin()
    return opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="course",
            title="Applied Course",
            description="A test course",
            location="Online",
            mode="online",
            duration="2 weeks",
            funding="free",
            apply_url="https://example.com/apply/course",
        ),
        created_by=admin_id,
    )


def _register(client, email):
    reg = client.post(
        "/api/auth/register",
        data={"email": email, "password": "supersecret1", "full_name": "Test User", "nickname": "nick"},
        content_type="application/json",
    )
    assert reg.status_code == 201, reg.content
    login = client.post(
        "/api/auth/login",
        data={"email": email, "password": "supersecret1"},
        content_type="application/json",
    )
    return login.json()["tokens"]


def _h(t): return {"Authorization": f"Bearer {t['access_token']}"}


@pytest.fixture
def admin_tokens():
    _ensure_admin()
    client = Client()
    login = client.post(
        "/api/auth/login",
        data={"email": "boss@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return login.json()["tokens"]


@pytest.mark.django_db
def test_applied_flow(opp):
    client = Client()
    tokens = _register(client, "applied@example.com")

    # list empty
    empty = client.get("/api/applied", headers=_h(tokens))
    assert empty.status_code == 200
    assert empty.json() == []

    # add
    added = client.post(
        "/api/applied",
        data={"opportunity_id": opp.id},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert added.status_code == 201, added.content
    assert added.json()["opportunity_id"] == opp.id

    # duplicate -> 409
    dup = client.post(
        "/api/applied",
        data={"opportunity_id": opp.id},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert dup.status_code == 409, dup.content

    # list has it
    listing = client.get("/api/applied", headers=_h(tokens))
    assert len(listing.json()) == 1

    # unauth -> 401
    assert client.get("/api/applied").status_code == 401

    # remove
    removed = client.delete(f"/api/applied/{opp.id}", headers=_h(tokens))
    assert removed.status_code == 204, removed.content
    assert client.get("/api/applied", headers=_h(tokens)).json() == []


@pytest.mark.django_db
def test_story_author_privacy(opp):
    """Stories must show nickname or first name — never the full name."""
    client = Client()
    tokens = _register(client, "privacy@example.com")

    story = client.post(
        "/api/stories",
        data={"opportunity_id": opp.id, "experience": "Nice!"},
        content_type="application/json",
        headers=_h(tokens),
    )
    assert story.status_code == 201, story.content
    # nickname is "nick"
    assert story.json()["author_name"] == "nick"

    listing = client.get(f"/api/stories/opportunity/{opp.id}")
    assert listing.json()["stories"][0]["author_name"] == "nick"


@pytest.mark.django_db
def test_analytics_most_applied(opp, admin_tokens):
    """After a user applies, the admin analytics show it under most_applied."""
    client = Client()
    tokens = _register(client, "applied2@example.com")
    client.post(
        "/api/applied",
        data={"opportunity_id": opp.id},
        content_type="application/json",
        headers=_h(tokens),
    )

    ok = client.get("/api/analytics", headers=_h(admin_tokens))
    assert ok.status_code == 200, ok.content
    body = ok.json()
    assert any(a["opportunity_id"] == opp.id for a in body["most_applied"])
