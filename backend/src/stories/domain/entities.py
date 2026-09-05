"""Stories domain entity (pure Python, no Django)."""

from __future__ import annotations

from dataclasses import dataclass

from src.shared.domain.entity import Entity

MAX_EXPERIENCE_LENGTH = 2000


@dataclass(kw_only=True)
class ParticipationStory(Entity):
    user_id: int
    opportunity_id: int
    experience: str
    # Read-only denormalised fields, filled in by the repository via
    # select_related so the API responses don't need extra queries.
    author_name: str = ""
    opportunity_title: str = ""
    # User ids who tapped "helpful" / reported this story.
    helpful: list[int] = None  # type: ignore[assignment]
    flags: list[int] = None  # type: ignore[assignment]
