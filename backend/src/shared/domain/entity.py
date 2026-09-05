"""Base building blocks for domain entities (pure Python, no Django)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(kw_only=True)
class Entity:
    """
    Base entity.

    Identity is the ``id`` (assigned by the persistence adapter). Entities are
    compared by identity, not by attribute value.
    """

    id: int | None = None
    created_at: datetime | None = field(default=None)
    updated_at: datetime | None = field(default=None)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, type(self)):
            return NotImplemented
        return self.id is not None and self.id == other.id

    def __hash__(self) -> int:
        return hash((type(self).__name__, self.id))
