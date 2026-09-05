"""HTTP DTOs (django-ninja / Pydantic schemas) for the gamification API."""

from __future__ import annotations

from ninja import Schema


class GamificationOut(Schema):
    points: int
    badges: list[dict] = []
    stats: dict = {}
