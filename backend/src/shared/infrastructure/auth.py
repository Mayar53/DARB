"""
Reusable JWT route protection (inbound infrastructure).

``JWTAuth`` is a django-ninja ``HttpBearer`` that any feature can attach to a
route via ``auth=JWTAuth()``. It is stateless: it verifies the access token and
exposes a lightweight ``AuthPrincipal`` as ``request.auth``. Routes that need
the full user load it through their own use case using ``principal.id``.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.http import HttpRequest
from ninja.security import HttpBearer

from src.shared.domain.exceptions import AuthenticationError
from src.shared.infrastructure.jwt import JwtCodec


@dataclass(frozen=True)
class AuthPrincipal:
    id: int
    email: str


class JWTAuth(HttpBearer):
    def __init__(self) -> None:
        super().__init__()
        self._codec = JwtCodec()

    def authenticate(self, request: HttpRequest, token: str) -> AuthPrincipal | None:
        try:
            payload = self._codec.decode(token, expected_type="access")
        except AuthenticationError:
            return None  # -> ninja responds 401
        return AuthPrincipal(id=int(payload["sub"]), email=payload.get("email", ""))
