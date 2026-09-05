"""JWT token adapter: implements the TokenService port via the shared codec."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from src.accounts.domain.entities import TokenPair, User
from src.accounts.domain.ports import TokenService
from src.shared.infrastructure.jwt import JwtCodec


class JwtTokenService(TokenService):
    def __init__(self, codec: JwtCodec | None = None, cfg: dict[str, Any] | None = None) -> None:
        self._codec = codec or JwtCodec()
        self._cfg = cfg or settings.JWT

    def issue(self, user: User) -> TokenPair:
        access = self._codec.encode(
            subject=user.id,
            token_type="access",
            ttl=self._cfg["ACCESS_TTL"],
            extra={"email": user.email},
        )
        refresh = self._codec.encode(
            subject=user.id,
            token_type="refresh",
            ttl=self._cfg["REFRESH_TTL"],
        )
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=int(self._cfg["ACCESS_TTL"].total_seconds()),
        )

    def subject_from_refresh(self, refresh_token: str) -> int:
        payload = self._codec.decode(refresh_token, expected_type="refresh")
        return int(payload["sub"])
