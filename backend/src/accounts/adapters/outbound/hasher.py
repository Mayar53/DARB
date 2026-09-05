"""Password hashing adapter backed by Django's configured hashers (Argon2)."""

from __future__ import annotations

from django.contrib.auth.hashers import check_password, make_password

from src.accounts.domain.ports import PasswordHasher


class DjangoPasswordHasher(PasswordHasher):
    def hash(self, raw_password: str) -> str:
        return make_password(raw_password)

    def verify(self, raw_password: str, hashed: str) -> bool:
        return check_password(raw_password, hashed)
