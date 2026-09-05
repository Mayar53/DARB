"""Persistence adapter: Django ORM implementation of PasswordResetRepository."""

from __future__ import annotations

from src.accounts.adapters.outbound.password_reset_models import (
    PasswordResetCode as PasswordResetCodeModel,
)
from src.accounts.domain.password_reset import PasswordResetCode
from src.accounts.domain.ports import PasswordResetRepository


class DjangoPasswordResetRepository(PasswordResetRepository):
    def create(self, *, email: str, code_hash: str, expires_at) -> PasswordResetCode:
        row = PasswordResetCodeModel.objects.create(
            email=email.strip().lower(),
            code_hash=code_hash,
            expires_at=expires_at,
        )
        return self._to_entity(row)

    def get_latest(self, email: str) -> PasswordResetCode | None:
        row = (
            PasswordResetCodeModel.objects.filter(email__iexact=email)
            .order_by("-created_at")
            .first()
        )
        return self._to_entity(row) if row else None

    def invalidate_for_email(self, email: str) -> None:
        PasswordResetCodeModel.objects.filter(email__iexact=email).update(used=True)

    def mark_used(self, code_id: int) -> None:
        PasswordResetCodeModel.objects.filter(pk=code_id).update(
            used=True,
        )

    @staticmethod
    def _to_entity(row: PasswordResetCodeModel) -> PasswordResetCode:
        return PasswordResetCode(
            id=row.pk,
            email=row.email,
            code_hash=row.code_hash,
            expires_at=row.expires_at,
            used=row.used,
            created_at=row.created_at,
        )
