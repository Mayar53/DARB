"""End-to-end tests for the stories feature (use cases + HTTP API)."""

import pytest
from django.test import Client

from src.accounts.application.use_cases import LoginCommand, RegisterCommand
from src.accounts.container import container as accounts_container
from src.opportunities.application.use_cases import OpportunityCommand
from src.opportunities.container import container as opportunities_container
from src.shared.domain.exceptions import NotFoundError
from src.stories.application.use_cases import CreateStoryCommand, UpdateStoryCommand
from src.stories.container import container
from src.stories.domain.exceptions import StoryConflict, StoryNotFound


@pytest.fixture
def db_with_opportunity(story_author):
    """A real opportunity (created by a real user) to attach stories to."""
    opportunity = opportunities_container().create_opportunity.execute(
        OpportunityCommand(
            category="volunteer",
            title="Test Cleanup",
            description="A test opportunity",
            location="Baghdad",
            mode="in-person",
            duration="1 day",
            funding="free",
            apply_url="https://example.com/apply/test",
        ),
        created_by=story_author,
    )
    return opportunity


@pytest.fixture
def story_author():
    """A real registered user id for use-case story tests."""
    user = accounts_container().register_user.execute(
        RegisterCommand(email="author@example.com", password="supersecret1", full_name="Story Author")
    )
    return user.id


@pytest.fixture
def user():
    accounts_container().register_user.execute(
        RegisterCommand(email="story@example.com", password="supersecret1", full_name="Story Teller")
    )
    return accounts_container().authenticate_user.execute(
        LoginCommand(email="story@example.com", password="supersecret1")
    )


def _auth_headers(tokens) -> dict:
    return {"Authorization": f"Bearer {tokens.access_token}"}


# --------------------------------------------------------------------------- #
# Use-case tests
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_create_story_then_list(db_with_opportunity, story_author):
    c = container()
    story = c.create_story.execute(
        CreateStoryCommand(
            opportunity_id=db_with_opportunity.id,
            experience="It was a great day, we cleaned the whole riverbank!",
        ),
        user_id=story_author,
    )
    assert story.id is not None
    assert story.user_id == story_author
    assert story.opportunity_id == db_with_opportunity.id

    stories = c.list_stories_for_opportunity.execute(db_with_opportunity.id)
    assert len(stories) == 1
    assert stories[0].experience.startswith("It was a great day")


@pytest.mark.django_db
def test_duplicate_story_rejected(db_with_opportunity, story_author):
    c = container()
    c.create_story.execute(
        CreateStoryCommand(opportunity_id=db_with_opportunity.id, experience="First share"),
        user_id=story_author,
    )
    with pytest.raises(StoryConflict):
        c.create_story.execute(
            CreateStoryCommand(opportunity_id=db_with_opportunity.id, experience="Second share"),
            user_id=story_author,
        )


@pytest.mark.django_db
def test_story_requires_existing_opportunity(db_with_opportunity, story_author):
    c = container()
    with pytest.raises(NotFoundError):
        c.create_story.execute(
            CreateStoryCommand(opportunity_id=99999, experience="Orphan story"),
            user_id=story_author,
        )


@pytest.mark.django_db
def test_cannot_edit_someone_elses_story(db_with_opportunity, story_author):
    c = container()
    # Register a second user.
    other = accounts_container().register_user.execute(
        RegisterCommand(email="other@example.com", password="supersecret1", full_name="Other User")
    )
    story = c.create_story.execute(
        CreateStoryCommand(opportunity_id=db_with_opportunity.id, experience="Original"),
        user_id=story_author,
    )
    with pytest.raises(StoryNotFound):
        c.update_story.execute(
            UpdateStoryCommand(story_id=story.id, experience="Hacked"),
            user_id=other.id,
        )


# --------------------------------------------------------------------------- #
# HTTP tests
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_api_public_opportunity_detail(db_with_opportunity):
    """Public GET /opportunities/{id} returns an active opportunity with the
    new age/certificate fields, and 404 for an inactive/missing one."""
    client = Client()

    detail = client.get(f"/api/opportunities/{db_with_opportunity.id}")
    assert detail.status_code == 200, detail.content
    body = detail.json()
    assert body["title"] == "Test Cleanup"
    assert body["age"] == "all"
    assert body["certificate"] is False

    missing = client.get("/api/opportunities/99999")
    assert missing.status_code == 404, missing.content


@pytest.mark.django_db
def test_api_story_flow(db_with_opportunity, user):
    client = Client()
    tokens = user.tokens

    # Create a story
    created = client.post(
        "/api/stories",
        data={
            "opportunity_id": db_with_opportunity.id,
            "experience": "Participated and learned a lot!",
        },
        content_type="application/json",
        headers=_auth_headers(tokens),
    )
    assert created.status_code == 201, created.content
    story_id = created.json()["id"]

    # Duplicate -> 409
    dup = client.post(
        "/api/stories",
        data={
            "opportunity_id": db_with_opportunity.id,
            "experience": "Second attempt",
        },
        content_type="application/json",
        headers=_auth_headers(tokens),
    )
    assert dup.status_code == 409, dup.content

    # Public list includes my_story for the author
    listing = client.get(f"/api/stories/opportunity/{db_with_opportunity.id}")
    assert listing.status_code == 200
    body = listing.json()
    assert len(body["stories"]) == 1
    # Privacy: only the first name (or nickname) is shown, never full name.
    assert body["stories"][0]["author_name"] == "Story"
    assert body["my_story"] is None  # unauthenticated -> no my_story

    # Authenticated list -> my_story is populated
    authed_listing = client.get(
        f"/api/stories/opportunity/{db_with_opportunity.id}",
        headers=_auth_headers(tokens),
    )
    assert authed_listing.json()["my_story"]["id"] == story_id

    # Edit own story
    edited = client.put(
        f"/api/stories/{story_id}",
        data={"experience": "Edited reflection"},
        content_type="application/json",
        headers=_auth_headers(tokens),
    )
    assert edited.status_code == 200, edited.content
    assert edited.json()["experience"] == "Edited reflection"

    # Delete own story
    deleted = client.delete(f"/api/stories/{story_id}", headers=_auth_headers(tokens))
    assert deleted.status_code == 204, deleted.content

    # Unauthenticated create -> 401
    anon = client.post(
        "/api/stories",
        data={"opportunity_id": db_with_opportunity.id, "experience": "anon"},
        content_type="application/json",
    )
    assert anon.status_code == 401, anon.content
