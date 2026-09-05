"""
Application use cases for the opportunities feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.accounts.domain.entities import User
from src.accounts.domain.permissions import (
    CREATE_OPPORTUNITY,
    DELETE_ANY_OPPORTUNITY,
    DELETE_OWN_OPPORTUNITY,
    EDIT_ANY_OPPORTUNITY,
    EDIT_OWN_OPPORTUNITY,
    HIDE_ANY_OPPORTUNITY,
    HIDE_OWN_OPPORTUNITY,
    has_permission,
)
from src.opportunities.domain.entities import (
    CATEGORY_KEYS,
    FIELD_KEYS,
    FUNDING_KEYS,
    MODE_KEYS,
    Opportunity,
    is_valid_age,
)
from src.opportunities.domain.exceptions import OpportunityNotFound
from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.shared.domain.exceptions import PermissionDeniedError, ValidationError


STATUS_KEYS = ("draft", "published", "hidden", "archived")

# Legacy subject keys kept in the DB by pre-restructure migrations. Any payload
# or merged row still carrying one is silently remapped to its canonical key so
# edits never hard-fail on historical data ("Invalid fields: ai").
LEGACY_FIELD_ALIASES = {
    "ai": "ai-ml",
    "business": "business-economics",
    "social-sciences": "social-humanities",
}


def normalize_fields(fields: list[str]) -> list[str]:
    """Map legacy subject keys to their canonical equivalents (deduped)."""
    if not fields:
        return list(fields)
    seen: set[str] = set()
    out: list[str] = []
    for f in fields:
        key = LEGACY_FIELD_ALIASES.get(f, f)
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


# --------------------------------------------------------------------------- #
# Commands (application DTOs, framework-free)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class OpportunityCommand:
    category: str
    title: str
    description: str
    location: str = ""
    mode: str = "online"
    duration: str = ""
    funding: str = "free"
    price: str = ""
    deadline: date | None = None
    apply_url: str = ""
    status: str = "published"
    organization: str | int | None = None
    age: str = "all"
    certificate: bool = False
    fields: list[str] = field(default_factory=list)
    # Optional per-language overrides (never required; base title/description
    # doubles as the fallback for both locales).
    title_ar: str | None = None
    title_en: str | None = None
    description_ar: str | None = None
    description_en: str | None = None

@dataclass(frozen=True)
class OpportunityUpdate:
    category: str | None = None
    title: str | None = None
    description: str | None = None
    location: str | None = None
    mode: str | None = None
    duration: str | None = None
    funding: str | None = None
    price: str | None = None
    deadline: date | None = None
    apply_url: str | None = None
    status: str | None = None
    organization: str | int | None = None
    age: str | None = None
    certificate: bool | None = None
    fields: list[str] | None = None
    title_ar: str | None = None
    title_en: str | None = None
    description_ar: str | None = None
    description_en: str | None = None


def _validate(command: OpportunityCommand) -> None:
    if command.category not in CATEGORY_KEYS:
        raise ValidationError(f"Invalid category: {command.category}")
    if command.mode not in MODE_KEYS:
        raise ValidationError(f"Invalid mode: {command.mode}")
    if command.funding not in FUNDING_KEYS:
        raise ValidationError(f"Invalid funding: {command.funding}")
    if not is_valid_age(command.age):
        raise ValidationError(f"Invalid age: {command.age}")
    if command.status not in STATUS_KEYS:
        raise ValidationError(f"Invalid status: {command.status}")
    invalid_fields = [
        f for f in command.fields if f not in FIELD_KEYS and f not in LEGACY_FIELD_ALIASES
    ]
    if invalid_fields:
        raise ValidationError(f"Invalid fields: {', '.join(invalid_fields)}")
    if not command.title.strip():
        raise ValidationError("Title is required")
    if not command.description.strip():
        raise ValidationError("Description is required")


# --------------------------------------------------------------------------- #
# Use cases
# --------------------------------------------------------------------------- #
class ListOpportunities(UseCase[None, list[Opportunity]]):
    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, _data: None = None) -> list[Opportunity]:
        return self._repository.list_all()


class ListSubjectFields(UseCase[None, list[dict]]):
    """All subject/field nodes (parents + subcategories) for building the tree."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, _data: None = None) -> list[dict]:
        return self._repository.list_subject_fields()


class GetOpportunity(UseCase[int, Opportunity]):
    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, opportunity_id: int) -> Opportunity:
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise OpportunityNotFound()
        return opportunity


class GetActiveOpportunity(UseCase[int, Opportunity]):
    """Public detail: returns the opportunity only when it is active."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, opportunity_id: int) -> Opportunity:
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None or not opportunity.is_active:
            raise OpportunityNotFound()
        return opportunity


class CreateOpportunity(UseCase[OpportunityCommand, Opportunity]):
    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, data: OpportunityCommand, *, actor: User | None = None, created_by: int | None = None) -> Opportunity:
        """Create an opportunity.

        ``actor`` is the authenticated user (the API path) — the permission
        check is enforced. ``created_by`` is the owner id for internal/seed
        creation (tests, migrations) where the permission check is bypassed by
        construction.
        """
        _validate(data)
        owner_id = created_by
        if actor is not None:
            if not has_permission(actor, CREATE_OPPORTUNITY):
                raise PermissionDeniedError("You do not have permission to create opportunities")
            owner_id = actor.id
        if owner_id is None:
            raise PermissionDeniedError("You do not have permission to create opportunities")
        return self._repository.add(
            category=data.category,
            title=data.title.strip(),
            description=data.description.strip(),
            title_ar=(data.title_ar or "").strip() or None,
            title_en=(data.title_en or "").strip() or None,
            description_ar=(data.description_ar or "").strip() or None,
            description_en=(data.description_en or "").strip() or None,
            location=data.location.strip(),
            mode=data.mode,
            duration=data.duration.strip(),
            funding=data.funding,
            price=data.price,
            deadline=data.deadline,
            apply_url=data.apply_url.strip(),
            status=data.status,
            created_by=owner_id,
            organization=data.organization,
            age=data.age,
            certificate=data.certificate,
            fields=data.fields,
        )

class ListMyOpportunities(UseCase[int, list[Opportunity]]):
    """The opportunities created by one admin (any status)."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, owner_id: int) -> list[Opportunity]:
        return self._repository.list_by_owner(owner_id)


@dataclass(frozen=True)
class OpportunityDashboard:
    total: int
    visible: int
    hidden: int
    expired: int
    items: list[Opportunity]


class GetOpportunityDashboard(UseCase[int, OpportunityDashboard]):
    """Summary counts + the owner's opportunity list for the admin dashboard."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, owner_id: int) -> OpportunityDashboard:
        from datetime import date as _date

        today = _date.today()
        items = self._repository.list_by_owner(owner_id)
        visible = sum(1 for o in items if o.status == "published" and (o.deadline is None or o.deadline >= today))
        hidden = sum(1 for o in items if o.status == "hidden")
        expired = sum(1 for o in items if o.status == "published" and o.deadline is not None and o.deadline < today)
        return OpportunityDashboard(
            total=len(items),
            visible=visible,
            hidden=hidden,
            expired=expired,
            items=items,
        )


class UpdateOpportunity(UseCase[tuple[int, OpportunityUpdate], Opportunity]):
    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, data: tuple[int, OpportunityUpdate], *, actor: User | None = None) -> Opportunity:
        opportunity_id, update = data
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise OpportunityNotFound()

        # Determine what changed.
        changes = {
            key: value
            for key, value in {
                "category": update.category,
                "title": update.title,
                "description": update.description,
                "title_ar": update.title_ar,
                "title_en": update.title_en,
                "description_ar": update.description_ar,
                "description_en": update.description_en,
                "location": update.location,
                "mode": update.mode,
                "duration": update.duration,
                "funding": update.funding,
                "price": update.price,
                "deadline": update.deadline,
                "apply_url": update.apply_url,
                "status": update.status,
                "organization": update.organization,
                "age": update.age,
                "certificate": update.certificate,
                "fields": update.fields,
            }.items()
            if value is not None
        }
        status_changed = "status" in changes and changes["status"] != opportunity.status
        other_changed = any(k != "status" for k in changes)

        # A pure status change (hide/publish/archive) is gated by the hide
        # permissions; any other edit needs the edit permissions.
        if other_changed and (actor is None or not _can_edit(actor, opportunity)):
            raise PermissionDeniedError("You do not have permission to edit this opportunity")
        if status_changed and (actor is None or not _can_change_status(actor, opportunity)):
            raise PermissionDeniedError("You do not have permission to change this opportunity's status")

        # Validate the merged result as if it were a full command.
        merged = OpportunityCommand(**self._merge(opportunity, changes))
        _validate(merged)
        return self._repository.update(opportunity, **changes)

    @staticmethod
    def _merge(opportunity: Opportunity, changes: dict) -> dict:
        merged = {
            "category": opportunity.category,
            "title": opportunity.title,
            "description": opportunity.description,
            "title_ar": opportunity.title_ar,
            "title_en": opportunity.title_en,
            "description_ar": opportunity.description_ar,
            "description_en": opportunity.description_en,
            "location": opportunity.location,
            "mode": opportunity.mode,
            "duration": opportunity.duration,
            "funding": opportunity.funding,
            "price": opportunity.price,
            "deadline": opportunity.deadline,
            "apply_url": opportunity.apply_url,
            "status": opportunity.status,
            "organization": opportunity.organization,
            "age": opportunity.age,
            "certificate": opportunity.certificate,
            "fields": opportunity.fields,
        }
        merged.update(changes)
        return merged


def _can_edit(actor: User, opportunity: Opportunity) -> bool:
    if has_permission(actor, EDIT_ANY_OPPORTUNITY):
        return True
    if opportunity.created_by == actor.id and has_permission(actor, EDIT_OWN_OPPORTUNITY):
        return True
    return False


def _can_change_status(actor: User, opportunity: Opportunity) -> bool:
    """Status changes (hide/publish/archive) need the hide permissions."""
    if has_permission(actor, HIDE_ANY_OPPORTUNITY):
        return True
    if opportunity.created_by == actor.id and has_permission(actor, HIDE_OWN_OPPORTUNITY):
        return True
    return False


def _can_delete(actor: User, opportunity: Opportunity) -> bool:
    if has_permission(actor, DELETE_ANY_OPPORTUNITY):
        return True
    if opportunity.created_by == actor.id and has_permission(actor, DELETE_OWN_OPPORTUNITY):
        return True
    return False


class DeleteOpportunity(UseCase[int, None]):
    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, opportunity_id: int, *, actor: User | None = None) -> None:
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise OpportunityNotFound()

        if actor is None or not _can_delete(actor, opportunity):
            raise PermissionDeniedError("You do not have permission to delete this opportunity")

        self._repository.delete(opportunity_id)


class IncrementApplyClicks(UseCase[int, None]):
    """Called when someone taps "apply now" — feeds the analytics."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, opportunity_id: int) -> None:
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise OpportunityNotFound()
        self._repository.increment_apply_clicks(opportunity_id)


class IncrementViews(UseCase[int, None]):
    """Called when someone opens the public detail — feeds the analytics."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, opportunity_id: int) -> None:
        opportunity = self._repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise OpportunityNotFound()
        self._repository.increment_views(opportunity_id)


@dataclass(frozen=True)
class CsvOpportunityItem:
    category: str
    title: str
    description: str
    location: str
    mode: str
    duration: str
    funding: str
    age: str
    deadline: date | None
    certificate: bool
    apply_url: str = ""
    price: str = ""
    fields: list[str] = field(default_factory=list)


class CsvImport(UseCase[list[CsvOpportunityItem], int]):
    """Bulk-import opportunities from a CSV upload. Returns the count created."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, items: list[CsvOpportunityItem], *, created_by: int | None = None) -> int:
        rows = []
        for item in items:
            # apply_url arrives as a pydantic HttpUrl (or None) — normalise to str.
            apply_url = str(item.apply_url) if item.apply_url else ""
            command = OpportunityCommand(
                category=item.category,
                title=item.title,
                description=item.description,
                location=item.location,
                mode=item.mode,
                duration=item.duration,
                funding=item.funding,
                price=item.price,
                age=item.age,
                deadline=item.deadline,
                apply_url=apply_url,
                certificate=item.certificate,
                fields=item.fields,
            )
            _validate(command)
            rows.append(
                {
                    "category": item.category,
                    "title": item.title.strip(),
                    "description": item.description.strip(),
                    "location": item.location.strip(),
                    "mode": item.mode,
                    "duration": item.duration.strip(),
                    "funding": item.funding,
                    "price": item.price,
                    "deadline": item.deadline,
                    "apply_url": apply_url,
                    "status": "published",
                    "age": item.age,
                    "certificate": item.certificate,
                    "fields": item.fields,
                    "created_by_id": created_by,
                }
            )
        self._repository.bulk_add(rows)
        return len(rows)


@dataclass(frozen=True)
class AnalyticsResult:
    # Each entry: { opportunity_id, title, count }
    most_saved: list[dict]
    most_applied: list[dict]
    most_clicked: list[dict]
    # Each entry: { admin_id, admin_name, added_count, active_count, closed_count }
    per_admin: list[dict]


class GetAnalytics(UseCase[None, AnalyticsResult]):
    """Aggregates saved/applied/click counts and per-admin contribution."""

    def __init__(self, repository: OpportunityRepository) -> None:
        self._repository = repository

    def execute(self, _data: None = None) -> AnalyticsResult:
        all_opps = self._repository.list_all(include_inactive=True)
        # These counts need the saved/applied tables. Rather than reach across
        # features, the router composes this by passing in the counts. Here we
        # return a scaffold the router fills with real numbers.
        per_admin_map: dict[int, dict] = {}
        for o in all_opps:
            if o.created_by is None:
                continue
            entry = per_admin_map.setdefault(
                o.created_by,
                {"admin_id": o.created_by, "admin_name": o.created_by_name, "added_count": 0, "active_count": 0, "closed_count": 0},
            )
            entry["added_count"] += 1
            if o.is_active:
                entry["active_count"] += 1
            else:
                entry["closed_count"] += 1

        return AnalyticsResult(
            most_saved=[],
            most_applied=[],
            most_clicked=[
                {"opportunity_id": o.id, "title": o.title, "count": o.apply_clicks}
                for o in sorted(all_opps, key=lambda x: x.apply_clicks, reverse=True)
                if o.apply_clicks > 0
            ],
            per_admin=list(per_admin_map.values()),
        )
