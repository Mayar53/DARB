"""HTTP DTOs (django-ninja / Pydantic schemas) for the comments API."""

from __future__ import annotations

from datetime import datetime

from ninja import Schema
from pydantic import Field

from src.comments.domain.entities import MAX_COMMENT_LENGTH


class CommentIn(Schema):
    text: str = Field(min_length=1, max_length=MAX_COMMENT_LENGTH)
    opportunity_id: int | None = None
    story_id: int | None = None
    # Reply target — a top-level comment on the same opportunity. Replies to
    # replies are rejected (one level of nesting).
    parent_id: int | None = None


class CommentOut(Schema):
    id: int
    text: str
    author_name: str
    author_avatar: str = ""
    user_id: int
    opportunity_id: int | None = None
    story_id: int | None = None
    # The author's role, exposed so the UI can badge admins/owner replies.
    # Privacy-safe: role is a coarse label, not a full identity.
    author_role: str = ""
    author_is_staff: bool = False
    parent_id: int | None = None
    created_at: datetime
    updated_at: datetime
