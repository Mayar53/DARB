"""Applied-opportunity domain entity (pure Python, no Django)."""

from __future__ import annotations

from dataclasses import dataclass

from src.shared.domain.entity import Entity


@dataclass(kw_only=True)
class AppliedOpportunity(Entity):
    user_id: int
    opportunity_id: int
