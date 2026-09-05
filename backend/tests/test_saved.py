"""End-to-end tests for the saved feature (use cases + HTTP API)."""

import pytest
from django.test import Client

from src.accounts.application.use_cases import RegisterCommand
from src.accounts.container import container as accounts_container
from src.opportunities.application.use_cases import OpportunityCommand
from src.opportunities.container import container as opportunities_container
from src.saved.container import container
from src.saved.domain.exceptions import SavedConflict, SavedNotFound
from src.shared.domain.exceptions import NotFoundError


@pytest.fixture
def user():
    registered = accounts_container().register_user.execute(
        RegisterCommand(email="saver@example.com", password="supersecret1", full_name="Saver")
    )
    return accounts_container().get_current_user.execute(registered.id)


@pytest.fixture
def opportunity(user):
    return opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="course",
            title="Test Course",
            description="A test course",
            location="Online",
            mode="online",
            duration="2 weeks",
            funding="free",
            apply_url="https://example.com/apply/course",
        ),
        created_by=user.id,
    )


# --------------------------------------------------------------------------- #
# Use-case tests
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_save_then_list_then_remove(user, opportunity):
    c = container()
    saved = c.add_saved.execute(user.id, opportunity_id=opportunity.id)
    assert saved.opportunity_id == opportunity.id

    mine = c.list_saved.execute(user.id)
    assert len(mine) == 1
    assert mine[0].opportunity_id == opportunity.id

    c.remove_saved.execute(user.id, opportunity_id=opportunity.id)
    assert c.list_saved.execute(user.id) == []


@pytest.mark.django_db
def test_duplicate_save_rejected(user, opportunity):
    c = container()
    c.add_saved.execute(user.id, opportunity_id=opportunity.id)
    with pytest.raises(SavedConflict):
        c.add_saved.execute(user.id, opportunity_id=opportunity.id)


@pytest.mark.django_db
def test_remove_missing_saved_rejected(user, opportunity):
    c = container()
    with pytest.raises(SavedNotFound):
        c.remove_saved.execute(user.id, opportunity_id=opportunity.id)


@pytest.mark.django_db
def test_save_missing_opportunity_rejected(user):
    c = container()
    with pytest.raises(NotFoundError):
        c.add_saved.execute(user.id, opportunity_id=99999)


# --------------------------------------------------------------------------- #
# HTTP tests
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_api_saved_flow(user, opportunity):
    client = Client()
    tokens = None
    # Login to get tokens
    login = client.post(
        "/api/auth/login",
        data={"email": "saver@example.com", "password": "supersecret1"},
        content_type="application/json",
    )
    tokens = login.json()["tokens"]
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Save
    added = client.post(
        "/api/saved",
        data={"opportunity_id": opportunity.id},
        content_type="application/json",
        headers=headers,
    )
    assert added.status_code == 201, added.content

    # List
    listing = client.get("/api/saved", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["opportunity_id"] == opportunity.id

    # Unauthenticated list -> 401
    assert client.get("/api/saved").status_code == 401

    # Delete
    removed = client.delete(f"/api/saved/{opportunity.id}", headers=headers)
    assert removed.status_code == 204, removed.content

    # List empty
    listing = client.get("/api/saved", headers=headers)
    assert listing.json() == []
