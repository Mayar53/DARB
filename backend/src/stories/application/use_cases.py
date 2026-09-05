"""
Application use cases for the stories feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.accounts.domain.ports import UserRepository
from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import NotFoundError, ValidationError

from src.stories.domain.entities import MAX_EXPERIENCE_LENGTH, ParticipationStory
from src.stories.domain.exceptions import StoryConflict, StoryNotFound
from src.stories.domain.ports import StoryRepository


# --------------------------------------------------------------------------- #
# Commands (application DTOs, framework-free)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CreateStoryCommand:
    opportunity_id: int
    experience: str


@dataclass(frozen=True)
class UpdateStoryCommand:
    story_id: int
    experience: str


def _validate_experience(experience: str) -> str:
    cleaned = experience.strip()
    if not cleaned:
        raise ValidationError("Experience is required")
    if len(cleaned) > MAX_EXPERIENCE_LENGTH:
        raise ValidationError(
            f"Experience must be at most {MAX_EXPERIENCE_LENGTH} characters"
        )
    return cleaned


# --------------------------------------------------------------------------- #
# Use cases
# --------------------------------------------------------------------------- #
class ListStoriesForOpportunity(UseCase[int, list[ParticipationStory]]):
    def __init__(
        self,
        stories: StoryRepository,
        opportunities: OpportunityRepository,
    ) -> None:
        self._stories = stories
        self._opportunities = opportunities

    def execute(self, opportunity_id: int) -> list[ParticipationStory]:
        if self._opportunities.get_by_id(opportunity_id) is None:
            raise NotFoundError("Opportunity not found")
        return self._stories.list_for_opportunity(opportunity_id)


class GetMyStories(UseCase[int, list[ParticipationStory]]):
    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, user_id: int) -> list[ParticipationStory]:
        return self._stories.list_by_user(user_id)


class CreateStory(UseCase[CreateStoryCommand, ParticipationStory]):
    def __init__(
        self,
        stories: StoryRepository,
        opportunities: OpportunityRepository,
        users: UserRepository,
    ) -> None:
        self._stories = stories
        self._opportunities = opportunities
        self._users = users

    def execute(
        self, data: CreateStoryCommand, *, user_id: int
    ) -> ParticipationStory:
        experience = _validate_experience(data.experience)

        user = self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        if self._opportunities.get_by_id(data.opportunity_id) is None:
            raise NotFoundError("Opportunity not found")
        if self._stories.exists_for_user_and_opportunity(
            user_id, data.opportunity_id
        ):
            raise StoryConflict()

        return self._stories.add(
            user_id=user_id,
            opportunity_id=data.opportunity_id,
            experience=experience,
        )


class UpdateStory(UseCase[UpdateStoryCommand, ParticipationStory]):
    def __init__(
        self,
        stories: StoryRepository,
        users: UserRepository,
    ) -> None:
        self._stories = stories
        self._users = users

    def execute(
        self, data: UpdateStoryCommand, *, user_id: int
    ) -> ParticipationStory:
        story = self._stories.get_by_id(data.story_id)
        if story is None:
            raise StoryNotFound()
        if story.user_id != user_id:
            raise StoryNotFound()  # owners see 404, not 403
        return self._stories.update(
            story, experience=_validate_experience(data.experience)
        )


class DeleteStory(UseCase[int, None]):
    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, story_id: int, *, user_id: int) -> None:
        story = self._stories.get_by_id(story_id)
        if story is None or story.user_id != user_id:
            raise StoryNotFound()
        self._stories.delete(story_id)


class ToggleHelpful(UseCase[int, ParticipationStory]):
    """Tap "helpful" on a story — toggles on/off for the caller."""

    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, story_id: int, *, user_id: int) -> ParticipationStory:
        story = self._stories.toggle_helpful(story_id, user_id)
        if story is None:
            raise StoryNotFound()
        return story


class AddFlag(UseCase[int, ParticipationStory]):
    """Report a story; the same user can only report once."""

    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, story_id: int, *, user_id: int) -> ParticipationStory:
        story = self._stories.add_flag(story_id, user_id)
        if story is None:
            raise StoryNotFound()
        return story


class ClearFlags(UseCase[int, ParticipationStory]):
    """Admin action: keep the story and clear all reports."""

    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, story_id: int) -> ParticipationStory:
        story = self._stories.clear_flags(story_id)
        if story is None:
            raise StoryNotFound()
        return story


class ListFlagged(UseCase[None, list[ParticipationStory]]):
    """Admin action: every story that has at least one report."""

    def __init__(self, stories: StoryRepository) -> None:
        self._stories = stories

    def execute(self, _data: None = None) -> list[ParticipationStory]:
        return self._stories.list_flagged()
