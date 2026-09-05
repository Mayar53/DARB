"""Inbound HTTP adapter: the django-ninja router for the applied feature.

The router is thin — it validates input, authorises the caller, delegates to a
use case from the composition root, and lets the domain entities serialize into
the response schemas.
"""

from __future__ import annotations

from ninja import Router, Status

from src.applied.adapters.inbound import schemas as s
from src.applied.container import container
from src.gamification.container import container as gamification_container
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


@router.get("", auth=jwt_auth, response=list[s.AppliedOut])
def list_applied(request):
    principal: AuthPrincipal = request.auth
    return container().list_applied.execute(principal.id)


@router.post("", auth=jwt_auth, response={201: s.AppliedOut})
def add_applied(request, payload: s.AppliedIn):
    principal: AuthPrincipal = request.auth
    applied = container().add_applied.execute(
        principal.id, opportunity_id=payload.opportunity_id
    )
    # Points/badges depend on the applied set — recompute after the change.
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(201, applied)


@router.delete("/{opportunity_id}", auth=jwt_auth, response={204: None})
def remove_applied(request, opportunity_id: int):
    principal: AuthPrincipal = request.auth
    container().remove_applied.execute(principal.id, opportunity_id=opportunity_id)
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(204, None)
