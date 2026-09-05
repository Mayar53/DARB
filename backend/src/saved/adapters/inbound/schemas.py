"""HTTP DTOs (django-ninja / Pydantic schemas) for the saved API."""

from __future__ import annotations

from ninja import Schema


class SavedIn(Schema):
    opportunity_id: int


class SavedOut(Schema):
    id: int
    user_id: int
    opportunity_id: int
