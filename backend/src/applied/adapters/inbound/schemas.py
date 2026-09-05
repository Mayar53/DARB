"""HTTP DTOs (django-ninja / Pydantic schemas) for the applied API."""

from __future__ import annotations

from ninja import Schema


class AppliedIn(Schema):
    opportunity_id: int


class AppliedOut(Schema):
    id: int
    user_id: int
    opportunity_id: int
