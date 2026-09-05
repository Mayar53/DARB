"""HTTP DTOs (django-ninja / Pydantic schemas) for the stories API."""

from __future__ import annotations

from datetime import datetime

from ninja import Schema
from pydantic import Field

from src.stories.domain.entities import MAX_EXPERIENCE_LENGTH


class StoryIn(Schema):
    opportunity_id: int
    experience: str = Field(min_length=1, max_length=MAX_EXPERIENCE_LENGTH)


class StoryUpdateIn(Schema):
    experience: str = Field(min_length=1, max_length=MAX_EXPERIENCE_LENGTH)


class StoryOut(Schema):
    id: int
    opportunity_id: int
    experience: str
    author_name: str
    helpful: list[int] = []
    flags: list[int] = []
    created_at: datetime
    updated_at: datetime


class StoryListOut(Schema):
    stories: list[StoryOut]
    my_story: StoryOut | None = None
