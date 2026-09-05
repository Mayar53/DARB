"""Inbound HTTP adapter: the django-ninja router for the opportunities feature.

The router is thin — it validates input, authorises the caller (role +
permissions from the accounts feature), delegates to a use case, and lets the
domain entities serialize into the response schemas. Business logic lives in
the use cases.
"""

from __future__ import annotations

from ninja import Router, Status

from django.core.signing import BadSignature, SignatureExpired, dumps, loads
from django.http import JsonResponse

from src.accounts.container import container as accounts_container
from src.accounts.domain.entities import User
from src.accounts.domain.permissions import REVIEW_OPPORTUNITIES, has_permission
from src.opportunities.adapters.inbound import schemas as s
from src.opportunities.application.use_cases import (
    CsvOpportunityItem,
    OpportunityCommand,
    OpportunityUpdate,
    normalize_fields,
)
from src.opportunities.container import container
from src.shared.domain.exceptions import PermissionDeniedError
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()

#: Name of the cookie that tracks which opportunities an anonymous browser has
#: already viewed, so refreshes / repeat visits don't inflate the view counter.
_VIEWED_COOKIE = "darb_viewed"
#: Signed cookie max age (days). After this the list resets and old repeat
#: visits may count again — a reasonable bound that keeps the cookie small.
_VIEWED_COOKIE_MAX_AGE_DAYS = 90


def _require_staff(request) -> User:
    """Return the caller after verifying they are staff (owner or admin)."""
    principal: AuthPrincipal = request.auth
    user = accounts_container().get_current_user.execute(principal.id)
    if not user.is_staff:
        raise PermissionDeniedError("Staff account required")
    return user


def _optional_principal(request) -> AuthPrincipal | None:
    """Resolve the caller from the Authorization header, or None if absent/invalid."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        return jwt_auth.authenticate(request, header.removeprefix("Bearer ").strip())
    except Exception:
        return None


def _read_viewed_cookie(request) -> set[int]:
    """The opportunity ids this anonymous browser has already viewed."""
    raw = request.COOKIES.get(_VIEWED_COOKIE)
    if not raw:
        return set()
    try:
        value = loads(raw, max_age=_VIEWED_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60)
        return {int(i) for i in value if str(i).isdigit()}
    except (BadSignature, SignatureExpired, ValueError):
        return set()


def _mark_viewed(response, opportunity_id: int, viewed: set[int]) -> None:
    """Persist the (updated) set of viewed ids back into the signed cookie."""
    viewed.add(opportunity_id)
    # Bound the cookie size: keep only the most recent ids if it ever grows huge.
    ids = sorted(viewed)[-500:]
    response.set_cookie(
        _VIEWED_COOKIE,
        dumps(ids),
        max_age=_VIEWED_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="Lax",
        path="/",
    )


def _with_applied_counts(opps):
    """Attach applied_count, saved_count + comment_count to each opportunity.

    views/apply_clicks come from the opportunity row itself; the applied count
    comes from the applied feature's table, the saved count from the saved
    feature's table, and the comment count from the comments feature's table
    (read-only aggregations).
    """
    from collections import Counter
    from src.applied.adapters.outbound.orm_models import AppliedOpportunityModel
    from src.comments.adapters.outbound.orm_models import CommentModel
    from src.saved.adapters.outbound.orm_models import SavedOpportunityModel
    applied = Counter(AppliedOpportunityModel.objects.values_list("opportunity_id", flat=True))
    saved = Counter(SavedOpportunityModel.objects.values_list("opportunity_id", flat=True))
    comments = Counter(CommentModel.objects.exclude(opportunity_id__isnull=True).values_list("opportunity_id", flat=True))
    for o in opps:
        object.__setattr__(o, "applied_count", applied.get(o.id, 0))
        object.__setattr__(o, "saved_count", saved.get(o.id, 0))
        object.__setattr__(o, "comment_count", comments.get(o.id, 0))
    return opps


def _resolve_organization(organization, website: str = ""):
    """Resolve a provider/organization value to an id.

    - int → an existing Organization id (unchanged)
    - str → find-or-create the Organization by name (free-text provider);
      the optional website is only stored on a brand-new Organization row
      (existing rows keep their own website).
    - None/empty → None
    """
    if organization is None:
        return None
    if isinstance(organization, int):
        return organization
    name = str(organization).strip()
    if not name:
        return None
    org = accounts_container().organizations.create(name=name, website=website)
    return org.id


@router.get("", response=list[s.OpportunityOut])
def list_opportunities(request):
    """Public: published opportunities only."""
    return _with_applied_counts(container().list_opportunities.execute(None))


@router.get("/subject-fields", response=list[s.SubjectFieldOut])
def list_subject_fields(request):
    """Public: all subject/field nodes (parents + subcategories) for the tree."""
    return container().list_subject_fields.execute(None)


@router.get("/all", auth=jwt_auth, response=list[s.OpportunityOut])
def list_all_opportunities(request):
    """Staff with review_opportunities: every opportunity, any status.
    Declared before /{opportunity_id} so the literal path wins."""
    user = _require_staff(request)
    if not has_permission(user, REVIEW_OPPORTUNITIES):
        raise PermissionDeniedError("You do not have permission to review opportunities")
    from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
    return _with_applied_counts(DjangoOpportunityRepository().list_all(include_inactive=True))


@router.get("/mine", auth=jwt_auth, response=list[s.OpportunityOut])
def list_my_opportunities(request):
    """Staff: the opportunities created by the authenticated admin."""
    user = _require_staff(request)
    return _with_applied_counts(container().list_my_opportunities.execute(user.id))


@router.get("/dashboard", auth=jwt_auth, response=s.OpportunityDashboardOut)
def opportunity_dashboard(request):
    """Staff: the authenticated admin's opportunity counts + list."""
    user = _require_staff(request)
    return container().get_opportunity_dashboard.execute(user.id)


@router.post("/import", auth=jwt_auth, response=s.CsvImportOut)
def import_opportunities(request, payload: s.CsvImportIn):
    """Staff: bulk-import opportunities from CSV rows."""
    user = _require_staff(request)
    items = []
    for row in payload.rows:
        items.append(
            CsvOpportunityItem(
                category=row.category,
                title=row.title,
                description=row.description,
                location=row.location,
                mode=row.mode,
                duration=row.duration,
                funding=row.funding,
                price=row.price,
                age=row.age,
                deadline=row.deadline,
                apply_url=row.apply_url,
                certificate=row.certificate,
            )
        )
    count = container().csv_import.execute(items, created_by=user.id)
    return {"imported": count}


@router.get("/{opportunity_id}", response=s.OpportunityOut)
def get_opportunity(request, opportunity_id: int):
    """Public: a single published opportunity (404 if missing or not public).

    Records a view for analytics. Signed-in users count once per opportunity
    (idempotent per-user record — refreshes/reopens don't inflate the counter);
    anonymous browsers count once per opportunity too, deduped by a signed
    ``darb_viewed`` cookie so refreshes and repeat visits don't inflate the
    counter either.
    """
    opp = container().get_active_opportunity.execute(opportunity_id)

    # Signed-in viewer: record a distinct per-user view. Increment the public
    # counter only when this is the user's FIRST view of the opportunity.
    principal = _optional_principal(request)
    viewed: set[int] = set()
    if principal is not None:
        from src.gamification.adapters.outbound.repositories import DjangoGamificationRepository

        newly_recorded = DjangoGamificationRepository().record_view(principal.id, opportunity_id)
        if newly_recorded:
            container().increment_views.execute(opportunity_id)
    else:
        # Anonymous viewer — count only the first time this browser opens the
        # opportunity (tracked via the signed cookie).
        viewed = _read_viewed_cookie(request)
        if opportunity_id not in viewed:
            container().increment_views.execute(opportunity_id)

    payload = _with_applied_counts([opp])[0]
    # Serialize through the response schema and return a real HttpResponse so the
    # dedupe cookie can be attached (ninja passes HttpResponseBase through as-is).
    data = s.OpportunityOut.model_validate(payload, from_attributes=True).model_dump(mode="json")
    response = JsonResponse(data)
    if principal is None:
        _mark_viewed(response, opportunity_id, viewed)
    return response


@router.post("/{opportunity_id}/click", auth=jwt_auth, response={204: None})
def click_opportunity(request, opportunity_id: int):
    """Track an 'apply now' click (auth optional but we require any user)."""
    container().increment_apply_clicks.execute(opportunity_id)
    return Status(204, None)


@router.post("", auth=jwt_auth, response={201: s.OpportunityOut})
def create_opportunity(request, payload: s.OpportunityIn):
    user = _require_staff(request)
    # apply_url arrives as a pydantic HttpUrl (or None when omitted) — normalise to str.
    data = payload.model_dump()
    data["apply_url"] = str(data["apply_url"]) if data.get("apply_url") else ""
    website = data.get("organization_website") or ""
    data["organization"] = _resolve_organization(data.get("organization"), website)
    data.pop("organization_website", None)
    if data.get("fields"):
        data["fields"] = normalize_fields(data["fields"])
    command = OpportunityCommand(**data)
    opportunity = container().create_opportunity.execute(command, actor=user)
    return Status(201, opportunity)


@router.put("/{opportunity_id}", auth=jwt_auth, response=s.OpportunityOut)
def update_opportunity(request, opportunity_id: int, payload: s.OpportunityUpdateIn):
    user = _require_staff(request)
    data = payload.model_dump(exclude_unset=True)
    if "organization" in data or "organization_website" in data:
        website = data.get("organization_website") or ""
        data["organization"] = _resolve_organization(data.get("organization"), website)
    data.pop("organization_website", None)
    if data.get("fields"):
        data["fields"] = normalize_fields(data["fields"])
    update = OpportunityUpdate(**data)
    if update.apply_url is not None:
        # HttpUrl -> str (or None when the caller explicitly clears the URL).
        value = update.apply_url
        update = OpportunityUpdate(**{**update.__dict__, "apply_url": str(value) if value else ""})
    return container().update_opportunity.execute((opportunity_id, update), actor=user)


@router.delete("/{opportunity_id}", auth=jwt_auth, response={204: None})
def delete_opportunity(request, opportunity_id: int):
    user = _require_staff(request)
    container().delete_opportunity.execute(opportunity_id, actor=user)
    return Status(204, None)
