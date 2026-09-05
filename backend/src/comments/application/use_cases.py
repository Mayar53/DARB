"""
Application use cases for the comments feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.comments.domain.entities import MAX_COMMENT_LENGTH, Comment
from src.comments.domain.exceptions import CommentNotFound
from src.comments.domain.ports import CommentRepository
from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import NotFoundError, ValidationError
from src.stories.domain.ports import StoryRepository


@dataclass(frozen=True)
class CreateCommentCommand:
    text: str
    opportunity_id: int | None = None
    story_id: int | None = None
    parent_id: int | None = None


def _validate_text(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise ValidationError("Comment is required")
    if len(cleaned) > MAX_COMMENT_LENGTH:
        raise ValidationError(f"Comment must be at most {MAX_COMMENT_LENGTH} characters")
    return cleaned


def _validate_target(command: CreateCommentCommand) -> None:
    has_opp = command.opportunity_id is not None
    has_story = command.story_id is not None
    if has_opp == has_story:
        raise ValidationError("A comment must target exactly one opportunity or story")


def _validate_reply(command: CreateCommentCommand, parent: Comment | None) -> None:
    """A reply must point at a top-level comment on the same opportunity."""
    if command.parent_id is None:
        return
    if parent is None:
        raise ValidationError("The comment you are replying to does not exist")
    # One level of nesting: only top-level comments (no parent) can be replied to.
    if parent.parent_id is not None:
        raise ValidationError("Replies can only be made to a comment, not to another reply")
    # The reply must target the same container as its parent.
    if command.opportunity_id is None or parent.opportunity_id is None:
        raise ValidationError("A reply must target the same opportunity as the comment")
    if parent.opportunity_id != command.opportunity_id:
        raise ValidationError("A reply must target the same opportunity as the comment")


class ListOpportunityComments(UseCase[int, list[Comment]]):
    def __init__(
        self,
        comments: CommentRepository,
        opportunities: OpportunityRepository,
    ) -> None:
        self._comments = comments
        self._opportunities = opportunities

    def execute(self, opportunity_id: int) -> list[Comment]:
        if self._opportunities.get_by_id(opportunity_id) is None:
            raise NotFoundError("Opportunity not found")
        return self._comments.list_for_opportunity(opportunity_id)


class ListStoryComments(UseCase[int, list[Comment]]):
    def __init__(
        self,
        comments: CommentRepository,
        stories: StoryRepository,
    ) -> None:
        self._comments = comments
        self._stories = stories

    def execute(self, story_id: int) -> list[Comment]:
        if self._stories.get_by_id(story_id) is None:
            raise NotFoundError("Story not found")
        return self._comments.list_for_story(story_id)


class CreateComment(UseCase[CreateCommentCommand, Comment]):
    def __init__(
        self,
        comments: CommentRepository,
        opportunities: OpportunityRepository,
        stories: StoryRepository,
    ) -> None:
        self._comments = comments
        self._opportunities = opportunities
        self._stories = stories

    def execute(self, data: CreateCommentCommand, *, user_id: int) -> Comment:
        text = _validate_text(data.text)
        _validate_target(data)

        if data.opportunity_id is not None:
            if self._opportunities.get_by_id(data.opportunity_id) is None:
                raise NotFoundError("Opportunity not found")
        if data.story_id is not None:
            if self._stories.get_by_id(data.story_id) is None:
                raise NotFoundError("Story not found")

        # Replies only make sense on opportunity threads (stories are read-only
        # lists of experiences); validate the parent comment when one is given.
        parent = None
        if data.parent_id is not None:
            parent = self._comments.get_by_id(data.parent_id)
            _validate_reply(data, parent)

        return self._comments.add(
            user_id=user_id,
            text=text,
            opportunity_id=data.opportunity_id,
            story_id=data.story_id,
            parent_id=data.parent_id if parent is not None else None,
        )


class DeleteComment(UseCase[int, None]):
    """Delete a comment. The author may delete their own; staff (admins and
    the owner) may moderate-delete any comment."""

    def __init__(self, comments: CommentRepository) -> None:
        self._comments = comments

    def execute(
        self, comment_id: int, *, user_id: int, is_staff: bool = False
    ) -> None:
        comment = self._comments.get_by_id(comment_id)
        if comment is None:
            raise CommentNotFound()
        if not is_staff and comment.user_id != user_id:
            # Owners see 404, not 403 — mirrors the stories pattern.
            raise CommentNotFound()
        self._comments.delete(comment_id)
