"""Admin-application domain entity and status enum (pure Python).

An admin application is a request record linked to the applicant's existing
user account. It starts ``pending``, the OWNER can keep it ``waitlisted``
(indefinitely, re-reviewable) or ``approved``. Approving upgrades the linked
user account to the appropriate admin role in place — no second account is
created.

There are two request types:
- ``admin`` (research/opportunity admin) — a person helping Darb.
- ``org`` (organization admin) — an NGO/organization representative.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from src.shared.domain.entity import Entity


class AdminApplicationStatus(str, Enum):
    PENDING = "pending"
    WAITLISTED = "waitlisted"
    APPROVED = "approved"
    REJECTED = "rejected"
    DECLINED = "declined"  # legacy alias for REJECTED
    ACTIVATED = "activated"


@dataclass(kw_only=True)
class AdminApplication(Entity):
    email: str
    full_name: str
    organization: str = ""
    website: str = ""
    position: str = ""
    reason: str = ""
    # "admin" (researcher) or "org" (organization admin) — what is requested.
    request_type: str = "admin"
    status: AdminApplicationStatus = AdminApplicationStatus.PENDING
    reviewed_by: int | None = None
    reviewed_at: object | None = None
    # The applicant's existing account (one application per account).
    user_id: int | None = None
    # Applicant's public nickname (copied from the linked user for display).
    nickname: str = ""
