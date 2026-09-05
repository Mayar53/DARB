"""HTTP DTOs (django-ninja / Pydantic schemas) for the accounts API."""

from __future__ import annotations

import re
from datetime import datetime

from ninja import Schema
from pydantic import EmailStr, Field, field_validator


def _normalize_website(value: str) -> str:
    """Accept an empty value, the literal 'None', or a valid URL.

    - empty / whitespace / "None" → stored as "" (no URL)
    - anything else must look like a real URL, otherwise raise.
    """
    v = (value or "").strip()
    if v.lower() in ("", "none"):
        return ""
    if "://" not in v:
        # Lenient like browsers: allow "example.com" → "https://example.com",
        # but reject clearly-invalid values (no dots, contains spaces, etc.).
        if not re.match(r"^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/:].*)?$", v):
            raise ValueError("website must be a valid URL")
        v = f"https://{v}"
    if not v.startswith(("http://", "https://")):
        raise ValueError("website must be a valid URL")
    return v


class RegisterIn(Schema):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    nickname: str = Field(default="", max_length=64)
    # Optional initial permissions (owner creates an admin with a preset set).
    permissions: list[str] | None = None


class AdminApplyIn(Schema):
    email: EmailStr
    full_name: str = Field(default="", max_length=255)
    organization: str = Field(default="", max_length=255)
    website: str = Field(default="", max_length=500)
    position: str = Field(default="", max_length=255)
    reason: str = Field(default="", max_length=2000)
    # "admin" (researcher) | "org" (organization admin)
    request_type: str = Field(default="admin", max_length=16)

    @field_validator("website")
    @classmethod
    def _validate_website(cls, value: str) -> str:
        return _normalize_website(value)


class AdminRegisterIn(Schema):
    """Admin Registration form. Website is OPTIONAL — empty is stored as ''."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    nickname: str = Field(default="", max_length=64)
    organization: str = Field(default="", max_length=255)
    website: str = Field(default="", max_length=500)
    request_type: str = Field(default="admin", max_length=16)

    @field_validator("website")
    @classmethod
    def _validate_website(cls, value: str) -> str:
        return _normalize_website(value)


class AdminStatusIn(Schema):
    email: EmailStr


class CreateApplicationForUserIn(Schema):
    user_id: int
    request_type: str = Field(default="admin", max_length=16)


class LoginIn(Schema):
    email: EmailStr
    password: str


class ForgotPasswordIn(Schema):
    email: EmailStr


class ResetPasswordIn(Schema):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class RefreshIn(Schema):
    refresh_token: str


class UserOut(Schema):
    id: int
    email: EmailStr
    full_name: str
    nickname: str = ""
    avatar: str = ""
    is_active: bool
    is_staff: bool
    role: str = "user"
    permissions: list[str] = []
    points: int = 0
    badges: list[dict] = []


class PublicProfileOut(Schema):
    """A user's public profile — never exposes email, full name, role or permissions."""

    id: int
    nickname: str = ""
    avatar: str = ""
    points: int = 0
    badges: list[dict] = []


class AdminApplicationOut(Schema):
    id: int
    email: str
    full_name: str
    nickname: str = ""
    organization: str = ""
    website: str = ""
    position: str = ""
    reason: str = ""
    request_type: str = "admin"
    status: str
    user_id: int | None = None
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class AdminApplicationStatusOut(Schema):
    status: str


class PermissionOut(Schema):
    key: str
    label: str


class OrganizationOut(Schema):
    id: int
    name: str
    website: str = ""
    description: str = ""
    created_at: datetime


class AdminLeaderboardEntryOut(Schema):
    """One admin's contribution — ranked by real DB counts. Owner-only."""

    admin_id: int
    admin_name: str = ""
    nickname: str = ""
    avatar: str = ""
    total_opportunities: int = 0
    active_opportunities: int = 0
    # The admin's submitted opportunities (id + title), newest first.
    opportunities: list[dict] = []


class OrganizationIn(Schema):
    name: str = Field(min_length=1, max_length=255)
    website: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=2000)


class AdminUpdateIn(Schema):
    """OWNER management of an admin: activate/deactivate + permissions."""

    is_active: bool | None = None
    permissions: list[str] | None = None
    organization_ids: list[int] | None = None


class ProfileUpdateIn(Schema):
    nickname: str | None = Field(default=None, max_length=64)
    avatar: str | None = Field(default=None, max_length=8)


class TokenOut(Schema):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class AuthOut(Schema):
    user: UserOut
    tokens: TokenOut
