"""Analytics endpoint — composes counts across features for the admin panel.

Kept in its own router (not bolted onto opportunities) because it needs the
saved table for "most saved" and the opportunities table for clicks/per-admin.
"""

from __future__ import annotations

from collections import Counter

from ninja import Router

from src.accounts.container import container as accounts_container
from src.applied.adapters.outbound.orm_models import AppliedOpportunityModel
from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.opportunities.container import container as opportunities_container
from src.saved.adapters.outbound.orm_models import SavedOpportunityModel
from src.shared.domain.exceptions import PermissionDeniedError
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


def _require_staff(request):
    principal: AuthPrincipal = request.auth
    user = accounts_container().get_current_user.execute(principal.id)
    if not user.is_staff:
        raise PermissionDeniedError("Staff account required")
    return user


@router.get("", auth=jwt_auth)
def analytics(request):
    """Admin-only: aggregated engagement + per-admin contribution."""
    _require_staff(request)

    analytics = opportunities_container().get_analytics.execute()

    # Most saved: count rows in the saved table per opportunity.
    saved_counts = Counter(SavedOpportunityModel.objects.values_list("opportunity_id", flat=True))
    # Most applied: count rows in the applied table per opportunity.
    applied_counts = Counter(AppliedOpportunityModel.objects.values_list("opportunity_id", flat=True))

    # Full list (incl. inactive) for titles.
    repo = DjangoOpportunityRepository()
    full = repo.list_all(include_inactive=True)
    by_id = {o.id: o for o in full}

    most_saved = [
        {"opportunity_id": oid, "title": by_id[oid].title if oid in by_id else "?", "count": c}
        for oid, c in saved_counts.most_common(5)
    ]
    most_applied = [
        {"opportunity_id": oid, "title": by_id[oid].title if oid in by_id else "?", "count": c}
        for oid, c in applied_counts.most_common(5)
    ]

    return {
        "most_saved": most_saved,
        "most_applied": most_applied,
        "most_clicked": analytics.most_clicked,
        "per_admin": analytics.per_admin,
    }
