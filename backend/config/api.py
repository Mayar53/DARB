"""
Composition of the HTTP layer.

A single ``NinjaAPI`` instance mounts every feature's inbound router and maps
domain exceptions to HTTP responses in one place (DRY). Features never import
each other; they only register a router here.
"""

from __future__ import annotations

from django.http import HttpRequest
from ninja import NinjaAPI
from ninja.errors import ValidationError

from src.accounts.adapters.inbound.router import router as accounts_router
from src.applied.adapters.inbound.router import router as applied_router
from src.comments.adapters.inbound.router import router as comments_router
from src.gamification.adapters.inbound.router import router as gamification_router
from src.opportunities.adapters.inbound.router import router as opportunities_router
from src.saved.adapters.inbound.router import router as saved_router
from src.shared.infrastructure.analytics_router import router as analytics_router
from src.stories.adapters.inbound.router import router as stories_router
from src.shared.domain.exceptions import (
    AuthenticationError,
    ConflictError,
    DomainError,
    NotFoundError,
    PermissionDeniedError,
)
from src.shared.domain.exceptions import (
    ValidationError as DomainValidationError,
)

api = NinjaAPI(title="Karkh API", version="1.0.0", description="Hexagonal Django + Ninja backend")

# --------------------------------------------------------------------------- #
# Feature routers
# --------------------------------------------------------------------------- #
api.add_router("/auth", accounts_router, tags=["auth"])
api.add_router("/opportunities", opportunities_router, tags=["opportunities"])
api.add_router("/stories", stories_router, tags=["stories"])
api.add_router("/saved", saved_router, tags=["saved"])
api.add_router("/applied", applied_router, tags=["applied"])
api.add_router("/gamification", gamification_router, tags=["gamification"])
api.add_router("/comments", comments_router, tags=["comments"])
api.add_router("/analytics", analytics_router, tags=["analytics"])


# --------------------------------------------------------------------------- #
# Domain-exception -> HTTP mapping (single source of truth)
# --------------------------------------------------------------------------- #
_STATUS_BY_EXCEPTION: list[tuple[type[DomainError], int]] = [
    (DomainValidationError, 422),
    (AuthenticationError, 401),
    (PermissionDeniedError, 403),
    (NotFoundError, 404),
    (ConflictError, 409),
]


@api.exception_handler(DomainError)
def handle_domain_error(request: HttpRequest, exc: DomainError):
    status = next((s for kind, s in _STATUS_BY_EXCEPTION if isinstance(exc, kind)), 400)
    return api.create_response(request, {"detail": str(exc), "code": exc.code}, status=status)


@api.exception_handler(ValidationError)
def handle_request_validation(request: HttpRequest, exc: ValidationError):
    return api.create_response(request, {"detail": exc.errors}, status=422)
