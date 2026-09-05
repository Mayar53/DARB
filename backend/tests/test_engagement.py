"""End-to-end tests for the new engagement/admin backend features:
story reactions + flags, CSV import, analytics, admin creation, nickname."""

import pytest
from django.test import Client

from src.accounts.container import container as accounts_container
from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.opportunities.application.use_cases import OpportunityCommand
from src.opportunities.container import container as opportunities_container


@pytest.fixture
def admin_tokens():
    """Bootstrap the OWNER via the repository (no seeded demo admin)."""
    from src.accounts.adapters.outbound.hasher import DjangoPasswordHasher
    from src.accounts.domain.permissions import OWNER_PERMISSIONS
    user = accounts_container().users.add_admin(
        email="boss@example.com",
        full_name="Boss Admin",
        password_hash=DjangoPasswordHasher().hash("supersecret1"),
    )
    accounts_container().users.set_role(user.id, role="owner", permissions=OWNER_PERMISSIONS)
    assert user.id is not None
    client = Client()
    login = client.post(
        "/api/auth/login",
        data={"email": "boss@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    assert login.status_code == 200, login.content
    return login.json()["tokens"]


@pytest.fixture
def user_tokens():
    client = Client()
    reg = client.post(
        "/api/auth/register",
        data={"email": "user@example.com", "password": "supersecret1", "full_name": "Test User", "nickname": "tester"},
        content_type="application/json",
    )
    assert reg.status_code == 201, reg.content
    login = client.post(
        "/api/auth/login",
        data={"email": "user@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    return login.json()["tokens"]


def _h(tokens): return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def opp(admin_tokens):
    from src.accounts.adapters.outbound.orm_models import UserModel
    admin_id = UserModel.objects.get(email="boss@example.com").id
    return opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="course",
            title="Analytics Course",
            description="A test course",
            location="Online",
            mode="online",
            duration="2 weeks",
            funding="free",
            apply_url="https://example.com/apply/course",
        ),
        created_by=admin_id,
    )


@pytest.mark.django_db
def test_nickname_on_register(user_tokens):
    """The register response should include the nickname."""
    # user_tokens already registered; check /me
    client = Client()
    me = client.get("/api/auth/me", headers=_h(user_tokens))
    assert me.status_code == 200
    assert me.json()["nickname"] == "tester"


@pytest.mark.django_db
def test_admin_can_create_admin(admin_tokens):
    client = Client()
    created = client.post(
        "/api/auth/admins",
        data={"email": "admin2@example.com", "password": "supersecret1", "full_name": "Second Admin", "nickname": "boss"},
        content_type="application/json",
        headers=_h(admin_tokens),
    )
    assert created.status_code == 201, created.content
    assert created.json()["is_staff"] is True

    listing = client.get("/api/auth/admins", headers=_h(admin_tokens))
    assert listing.status_code == 200
    assert any(a["email"] == "admin2@example.com" for a in listing.json())


@pytest.mark.django_db
def test_regular_user_cannot_create_admin(user_tokens):
    client = Client()
    created = client.post(
        "/api/auth/admins",
        data={"email": "admin3@example.com", "password": "supersecret1", "full_name": "Nope"},
        content_type="application/json",
        headers=_h(user_tokens),
    )
    assert created.status_code == 403, created.content


@pytest.mark.django_db
def test_story_helpful_and_flag(opp, user_tokens):
    client = Client()
    story = client.post(
        "/api/stories",
        data={"opportunity_id": opp.id, "experience": "Great course!"},
        content_type="application/json",
        headers=_h(user_tokens),
    )
    assert story.status_code == 201, story.content
    sid = story.json()["id"]

    helpful = client.post(f"/api/stories/{sid}/helpful", headers=_h(user_tokens))
    assert helpful.status_code == 200
    assert helpful.json()["helpful"] == [2]

    # toggle off
    helpful2 = client.post(f"/api/stories/{sid}/helpful", headers=_h(user_tokens))
    assert helpful2.json()["helpful"] == []

    flag = client.post(f"/api/stories/{sid}/flag", headers=_h(user_tokens))
    assert flag.status_code == 200
    assert flag.json()["flags"] == [2]


@pytest.mark.django_db
def test_flagged_list_staff_only(opp, user_tokens, admin_tokens):
    client = Client()
    story = client.post(
        "/api/stories",
        data={"opportunity_id": opp.id, "experience": "Suspicious"},
        content_type="application/json",
        headers=_h(user_tokens),
    )
    sid = story.json()["id"]
    client.post(f"/api/stories/{sid}/flag", headers=_h(user_tokens))

    # non-admin -> 403
    denied = client.get("/api/stories/flagged", headers=_h(user_tokens))
    assert denied.status_code == 403

    ok = client.get("/api/stories/flagged", headers=_h(admin_tokens))
    assert ok.status_code == 200
    assert len(ok.json()) == 1


@pytest.mark.django_db
def test_csv_import(admin_tokens):
    client = Client()
    rows = [
        {"title": "Imported One", "description": "d1", "category": "volunteer", "location": "Baghdad",
         "mode": "in-person", "duration": "1 day", "funding": "free", "age": "all",
         "deadline": "2026-12-01", "apply_url": "https://example.com/apply/1", "certificate": False},
        {"title": "Imported Two", "description": "d2", "category": "course", "location": "Online",
         "mode": "online", "duration": "2 weeks", "funding": "paid", "age": "15-18",
         "deadline": "2026-12-02", "apply_url": "https://example.com/apply/2", "certificate": True},
    ]
    res = client.post(
        "/api/opportunities/import",
        data={"rows": rows},
        content_type="application/json",
        headers=_h(admin_tokens),
    )
    assert res.status_code == 200, res.content
    assert res.json()["imported"] == 2

    repo = DjangoOpportunityRepository()
    all_opps = repo.list_all(include_inactive=True)
    titles = {o.title for o in all_opps}
    assert "Imported One" in titles
    assert "Imported Two" in titles


@pytest.mark.django_db
def test_apply_click_and_analytics(opp, admin_tokens, user_tokens):
    client = Client()
    # click requires auth per the router (any user)
    click = client.post(f"/api/opportunities/{opp.id}/click", headers=_h(user_tokens))
    assert click.status_code == 204, click.content

    # analytics admin-only
    denied = client.get("/api/analytics", headers=_h(user_tokens))
    assert denied.status_code == 403

    ok = client.get("/api/analytics", headers=_h(admin_tokens))
    assert ok.status_code == 200, ok.content
    body = ok.json()
    assert any(c["opportunity_id"] == opp.id for c in body["most_clicked"])
    assert body["per_admin"]  # at least one admin contributed


@pytest.mark.django_db
def test_opportunity_attribution(admin_tokens, opp):
    """The admin who created an opportunity shows up as created_by_name."""
    from src.accounts.adapters.outbound.orm_models import UserModel
    admin_id = UserModel.objects.get(email="boss@example.com").id
    client = Client()
    listing = client.get("/api/opportunities/all", headers=_h(admin_tokens))
    assert listing.status_code == 200
    match = [o for o in listing.json() if o["id"] == opp.id]
    assert match
    assert match[0]["created_by"] == admin_id
    assert match[0]["created_by_name"] == "Boss Admin"
