"""Persistence adapter: maps the Django ORM models to/from the domain entity."""

from __future__ import annotations

from django.db import IntegrityError

from src.gamification.adapters.outbound.orm_models import GamificationModel, UserViewModel
from src.gamification.domain.entities import Gamification
from src.gamification.domain.ports import GamificationRepository


class DjangoGamificationRepository(GamificationRepository):
    def get_for_user(self, user_id: int) -> Gamification | None:
        row = GamificationModel.objects.filter(user_id=user_id).first()
        return self._to_entity(row) if row else None

    def save(self, gamification: Gamification) -> Gamification:
        row, _ = GamificationModel.objects.update_or_create(
            user_id=gamification.user_id,
            defaults={
                "points": gamification.points,
                "badges": gamification.badges,
                "stats": gamification.stats,
            },
        )
        # Keep the denormalised UserModel.points/badges in sync so /auth/me and
        # the public profile endpoint always return fresh values.
        from src.accounts.adapters.outbound.orm_models import UserModel

        UserModel.objects.filter(pk=gamification.user_id).update(
            points=gamification.points,
            badges=gamification.badges,
        )
        return self._to_entity(row)

    def count_distinct_views(self, user_id: int) -> int:
        return UserViewModel.objects.filter(user_id=user_id).count()

    def record_view(self, user_id: int, opportunity_id: int) -> bool:
        """Idempotently record a view. Returns True if newly recorded."""
        try:
            UserViewModel.objects.create(user_id=user_id, opportunity_id=opportunity_id)
            return True
        except IntegrityError:
            return False

    @staticmethod
    def _to_entity(row: GamificationModel) -> Gamification:
        return Gamification(
            id=row.pk,
            user_id=row.user_id,
            points=row.points,
            badges=list(row.badges or []),
            stats=dict(row.stats or {}),
        )
