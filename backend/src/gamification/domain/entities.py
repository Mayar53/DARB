"""Gamification domain entities (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.shared.domain.entity import Entity


@dataclass(frozen=True)
class Badge:
    key: str
    emoji: str
    name: str
    description: str


@dataclass(kw_only=True)
class Gamification(Entity):
    user_id: int
    points: int = 0
    badges: list[dict] = field(default_factory=list)
    stats: dict = field(default_factory=dict)
