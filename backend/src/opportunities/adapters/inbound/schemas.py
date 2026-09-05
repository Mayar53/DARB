"""HTTP DTOs (django-ninja / Pydantic schemas) for the opportunities API."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from ninja import Schema
from pydantic import Field, HttpUrl, field_validator

from src.opportunities.domain.entities import is_valid_age

Category = Literal[
    "volunteer",
    "competition",
    "fellowship",
    "scholarship",
    "program",
    "internship",
    "course",
    "workshop",
    "session",
    "conference",
    "grant",
    "research",
    "exchange",
]
Mode = Literal["online", "in-person", "hybrid"]
Funding = Literal["paid", "free", "fully-funded", "partially-funded"]

# Age accepts the canonical keys plus free-text numeric ranges (see
# ``src.opportunities.domain.entities.is_valid_age``).
Age = str


def _empty_to_none(value):
    """Treat empty string as missing so optional HttpUrl fields accept ''."""
    if isinstance(value, str) and not value.strip():
        return None
    return value


class SubjectFieldOut(Schema):
    key: str
    label_en: str
    label_ar: str
    parent: str | None = None
    color: str = "#0E4749"


class OpportunityIn(Schema):
    category: Category
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    # Optional per-language overrides. Leave blank to fall back to title/
    # description for that language.
    title_ar: str | None = Field(default=None, max_length=255)
    title_en: str | None = Field(default=None, max_length=255)
    description_ar: str | None = None
    description_en: str | None = None
    location: str = Field(default="", max_length=255)
    mode: Mode = "online"
    duration: str = Field(default="", max_length=64)
    funding: Funding = "free"
    # Optional display price (exact, range, or with currency) for paid items.
    price: str = Field(default="", max_length=64)
    deadline: date | None = None
    # Optional: leave empty when the opportunity has no external application
    # page (e.g. apply by email/contact or in person). Never render a broken link.
    apply_url: HttpUrl | None = None
    status: Literal["draft", "published", "hidden", "archived"] = "published"
    organization: str | int | None = None
    # Optional NGO/organization website — set when creating/updating an
    # organization by name. Stored on the linked Organization row.
    organization_website: str = Field(default="", max_length=500)
    age: Age = "all"
    certificate: bool = False
    fields: list[str] = []

    @field_validator("apply_url", mode="before")
    @classmethod
    def _normalize_apply_url(cls, value):
        return _empty_to_none(value)

    @field_validator("age")
    @classmethod
    def _validate_age(cls, value):
        if value is None:
            return value
        v = str(value).strip()
        if not is_valid_age(v):
            raise ValueError(f"Invalid age: {value}")
        return v


class OpportunityUpdateIn(Schema):
    category: Category | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    title_ar: str | None = Field(default=None, max_length=255)
    title_en: str | None = Field(default=None, max_length=255)
    description_ar: str | None = None
    description_en: str | None = None
    location: str | None = Field(default=None, max_length=255)
    mode: Mode | None = None
    duration: str | None = Field(default=None, max_length=64)
    funding: Funding | None = None
    price: str | None = Field(default=None, max_length=64)
    deadline: date | None = None
    apply_url: HttpUrl | None = None
    status: Literal["draft", "published", "hidden", "archived"] | None = None
    organization: str | int | None = None
    organization_website: str | None = Field(default=None, max_length=500)
    age: Age | None = None
    certificate: bool | None = None
    fields: list[str] | None = None

    @field_validator("apply_url", mode="before")
    @classmethod
    def _normalize_apply_url(cls, value):
        return _empty_to_none(value)

    @field_validator("age")
    @classmethod
    def _validate_age(cls, value):
        if value is None:
            return value
        v = str(value).strip()
        if not is_valid_age(v):
            raise ValueError(f"Invalid age: {value}")
        return v


class OpportunityOut(Schema):
    id: int
    category: str
    title: str
    description: str
    title_ar: str | None = None
    title_en: str | None = None
    description_ar: str | None = None
    description_en: str | None = None
    location: str
    mode: str
    duration: str
    funding: str
    price: str = ""
    deadline: date | None
    apply_url: str = ""
    status: str
    # Backward-compatible alias: published == visible.
    is_active: bool
    organization: int | None = None
    organization_name: str = ""
    # NGO/organization website, when the org has one (optional, never required).
    organization_website: str = ""
    age: str
    certificate: bool
    fields: list[str] = []
    apply_clicks: int = 0
    views: int = 0
    applied_count: int = 0
    saved_count: int = 0
    comment_count: int = 0
    created_by: int | None = None
    created_by_name: str = ""
    created_at: datetime
    updated_at: datetime


class OpportunityDashboardOut(Schema):
    total: int
    visible: int
    hidden: int
    expired: int
    items: list[OpportunityOut]


class CsvRowIn(Schema):
    title: str
    description: str = ""
    category: Category = "volunteer"
    location: str = "Online"
    mode: Mode = "online"
    duration: str = ""
    funding: Funding = "free"
    price: str = Field(default="", max_length=64)
    age: Age = "all"
    deadline: date | None = None
    apply_url: HttpUrl | None = None
    certificate: bool = False
    fields: list[str] = []


class CsvImportIn(Schema):
    rows: list[CsvRowIn]


class CsvImportOut(Schema):
    imported: int
