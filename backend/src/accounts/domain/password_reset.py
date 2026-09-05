"""Password-reset code domain entity (pure Python).

A reset code is a short-lived, single-use token issued when a user requests a
password reset. Only its hash is ever persisted; the plaintext code is returned
to the requesting service exactly once (to be emailed to the user).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from src.shared.domain.entity import Entity


@dataclass(kw_only=True)
class PasswordResetCode(Entity):
    email: str
    code_hash: str
    expires_at: datetime
    used: bool = False
