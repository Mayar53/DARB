"""Comments domain entity (pure Python, no Django)."""

from __future__ import annotations

from dataclasses import dataclass

from src.shared.domain.entity import Entity

MAX_COMMENT_LENGTH = 500


@dataclass(kw_only=True)
class Comment(Entity):
    user_id: int
    text: str
    opportunity_id: int | None = None
    story_id: int | None = None
    parent_id: int | None = None
    # Read-only denormalised fields, filled in by the repository via
    # select_related so the API responses don't need extra queries.
    author_name: str = ""
    author_avatar: str = ""
    author_role: str = ""
    author_is_staff: bool = False
    created_at: object = None  # type: ignore[assignment]
    updated_at: object = None  # type: ignore[assignment]
