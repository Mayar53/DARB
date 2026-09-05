"""Inbound HTTP adapter: the django-ninja router for the saved feature.

The router is thin — it validates input, authorises the caller, delegates to a
use case from the composition root, and lets the domain entities serialize into
the response schemas.
"""

from __future__ import annotations

from ninja import Router, Status

from src.gamification.container import container as gamification_container
from src.saved.adapters.inbound import schemas as s
from src.saved.container import container
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


@router.get("", auth=jwt_auth, response=list[s.SavedOut])
def list_saved(request):
    principal: AuthPrincipal = request.auth
    return container().list_saved.execute(principal.id)


@router.post("", auth=jwt_auth, response={201: s.SavedOut})
def add_saved(request, payload: s.SavedIn):
    principal: AuthPrincipal = request.auth
    saved = container().add_saved.execute(
        principal.id, opportunity_id=payload.opportunity_id
    )
    # Points/badges depend on the saved set — recompute after the change.
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(201, saved)


@router.delete("/{opportunity_id}", auth=jwt_auth, response={204: None})
def remove_saved(request, opportunity_id: int):
    principal: AuthPrincipal = request.auth
    container().remove_saved.execute(
        principal.id, opportunity_id=opportunity_id
    )
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(204, None)
