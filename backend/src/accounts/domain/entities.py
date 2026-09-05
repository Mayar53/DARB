"""Accounts domain entities and value objects (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.shared.domain.entity import Entity


@dataclass(kw_only=True)
class User(Entity):
    email: str
    full_name: str = ""
    # Public-facing name shown on stories; never the full identity.
    nickname: str = ""
    avatar: str = ""
    is_active: bool = True
    is_staff: bool = False
    # "user" | "admin" | "owner" — the high-level role. Backend-enforced.
    role: str = "user"
    # Permission keys assigned to this user (empty for personal users; the
    # OWNER effectively has all permissions regardless of this list).
    permissions: list[str] = field(default_factory=list)
    # Gamification: denormalised points + badges, refreshed by recompute.
    points: int = 0
    badges: list[dict] = field(default_factory=list)
    # Opaque hash produced by the PasswordHasher port; never the raw password.
    password_hash: str | None = None


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"


@dataclass(kw_only=True)
class Organization(Entity):
    name: str
    website: str = ""
    description: str = ""
