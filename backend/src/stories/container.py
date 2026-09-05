"""
Composition root for the stories feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. The router asks the container for a use case; nothing else constructs
adapters.
"""

from __future__ import annotations

from functools import lru_cache

from src.accounts.adapters.outbound.repositories import DjangoUserRepository
from src.opportunities.adapters.outbound.repositories import (
    DjangoOpportunityRepository,
)
from src.stories.adapters.outbound.repositories import DjangoStoryRepository
from src.stories.application.use_cases import (
    AddFlag,
    ClearFlags,
    CreateStory,
    DeleteStory,
    GetMyStories,
    ListFlagged,
    ListStoriesForOpportunity,
    ToggleHelpful,
    UpdateStory,
)


class StoriesContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.stories = DjangoStoryRepository()
        self.opportunities = DjangoOpportunityRepository()
        self.users = DjangoUserRepository()

    @property
    def list_stories_for_opportunity(self) -> ListStoriesForOpportunity:
        return ListStoriesForOpportunity(self.stories, self.opportunities)

    @property
    def get_my_stories(self) -> GetMyStories:
        return GetMyStories(self.stories)

    @property
    def create_story(self) -> CreateStory:
        return CreateStory(self.stories, self.opportunities, self.users)

    @property
    def update_story(self) -> UpdateStory:
        return UpdateStory(self.stories, self.users)

    @property
    def delete_story(self) -> DeleteStory:
        return DeleteStory(self.stories)

    @property
    def toggle_helpful(self) -> ToggleHelpful:
        return ToggleHelpful(self.stories)

    @property
    def add_flag(self) -> AddFlag:
        return AddFlag(self.stories)

    @property
    def clear_flags(self) -> ClearFlags:
        return ClearFlags(self.stories)

    @property
    def list_flagged(self) -> ListFlagged:
        return ListFlagged(self.stories)


@lru_cache(maxsize=1)
def container() -> StoriesContainer:
    return StoriesContainer()
