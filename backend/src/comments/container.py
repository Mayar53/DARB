"""
Composition root for the comments feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. It reads opportunities/stories through their own repositories.
"""

from __future__ import annotations

from functools import lru_cache

from src.comments.adapters.outbound.repositories import DjangoCommentRepository
from src.comments.application.use_cases import (
    CreateComment,
    DeleteComment,
    ListOpportunityComments,
    ListStoryComments,
)
from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.stories.adapters.outbound.repositories import DjangoStoryRepository


class CommentsContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.comments = DjangoCommentRepository()
        self.opportunities = DjangoOpportunityRepository()
        self.stories = DjangoStoryRepository()

    @property
    def list_opportunity_comments(self) -> ListOpportunityComments:
        return ListOpportunityComments(self.comments, self.opportunities)

    @property
    def list_story_comments(self) -> ListStoryComments:
        return ListStoryComments(self.comments, self.stories)

    @property
    def create_comment(self) -> CreateComment:
        return CreateComment(self.comments, self.opportunities, self.stories)

    @property
    def delete_comment(self) -> DeleteComment:
        return DeleteComment(self.comments)


@lru_cache(maxsize=1)
def container() -> CommentsContainer:
    return CommentsContainer()
