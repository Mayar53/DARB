"""Inbound HTTP adapter: the django-ninja router for the gamification feature."""

from __future__ import annotations

from ninja import Router, Status

from src.gamification.adapters.inbound import schemas as s
from src.gamification.container import container
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


@router.get("/me", auth=jwt_auth, response=s.GamificationOut)
def my_gamification(request):
    """The caller's points + badges, recomputed from real activity."""
    principal: AuthPrincipal = request.auth
    return container().recompute_gamification.execute(principal.id)


@router.post("/views/{opportunity_id}", auth=jwt_auth, response={204: None})
def record_view(request, opportunity_id: int):
    """Idempotently record that the caller opened an opportunity detail.

    Feeds the Explorer badge, points, and "Made for you" recommendations.
    """
    principal: AuthPrincipal = request.auth
    container().record_view.execute((principal.id, opportunity_id))
    return Status(204, None)
