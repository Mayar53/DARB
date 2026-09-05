"""
Generic JWT codec (infrastructure).

This is feature-agnostic: it only knows how to sign and verify tokens using the
settings in ``settings.JWT``. Feature-specific token semantics (access vs
refresh, what claims to carry) live in each feature's token adapter, e.g.
``src/accounts/adapters/outbound/tokens.py``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from django.conf import settings

from src.shared.domain.exceptions import AuthenticationError


class JwtCodec:
    def __init__(self, cfg: dict[str, Any] | None = None) -> None:
        cfg = cfg or settings.JWT
        self._secret: str = cfg["SECRET"]
        self._algorithm: str = cfg["ALGORITHM"]
        self._issuer: str = cfg["ISSUER"]

    def encode(
        self,
        *,
        subject: int | str,
        token_type: str,
        ttl: timedelta,
        extra: dict[str, Any] | None = None,
    ) -> str:
        now = datetime.now(UTC)
        payload: dict[str, Any] = {
            "sub": str(subject),
            "type": token_type,
            "iat": now,
            "exp": now + ttl,
            "iss": self._issuer,
        }
        if extra:
            payload.update(extra)
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def decode(self, token: str, *, expected_type: str | None = None) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                issuer=self._issuer,
                options={"require": ["exp", "sub", "iss"]},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid or expired token") from exc

        if expected_type is not None and payload.get("type") != expected_type:
            raise AuthenticationError("Unexpected token type")
        return payload
