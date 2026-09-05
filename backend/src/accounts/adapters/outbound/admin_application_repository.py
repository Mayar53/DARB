"""Persistence adapter: Django ORM implementation of AdminApplicationRepository."""

from __future__ import annotations

from django.utils import timezone

from src.accounts.adapters.outbound.admin_application_models import (
    AdminApplication as AdminApplicationModel,
)
from src.accounts.domain.admin_application import (
    AdminApplication,
    AdminApplicationStatus,
)
from src.accounts.domain.ports import AdminApplicationRepository


class DjangoAdminApplicationRepository(AdminApplicationRepository):
    def create(
        self,
        *,
        email: str,
        full_name: str,
        organization: str = "",
        website: str = "",
        position: str = "",
        reason: str = "",
        user_id: int | None = None,
        request_type: str = "admin",
    ) -> AdminApplication:
        row = AdminApplicationModel.objects.create(
            email=email.strip().lower(),
            full_name=full_name.strip(),
            organization=organization.strip(),
            website=website.strip(),
            position=position.strip(),
            reason=reason.strip(),
            status=AdminApplicationStatus.PENDING.value,
            user_id=user_id,
            request_type=request_type,
        )
        return self._to_entity(row)

    def get_by_email(self, email: str) -> AdminApplication | None:
        row = AdminApplicationModel.objects.filter(email__iexact=email).first()
        return self._to_entity(row) if row else None

    def get_by_user_id(self, user_id: int) -> AdminApplication | None:
        row = AdminApplicationModel.objects.filter(user_id=user_id).first()
        return self._to_entity(row) if row else None

    def get_by_id(self, application_id: int) -> AdminApplication | None:
        row = AdminApplicationModel.objects.filter(pk=application_id).first()
        return self._to_entity(row) if row else None

    def list_all(self, request_type: str | None = None) -> list[AdminApplication]:
        rows = AdminApplicationModel.objects.all()
        if request_type:
            rows = rows.filter(request_type=request_type)
        rows = rows.order_by("created_at")
        return [self._to_entity(row) for row in rows]

    def list_by_status(self, status: AdminApplicationStatus | str) -> list[AdminApplication]:
        value = status.value if isinstance(status, AdminApplicationStatus) else status
        rows = AdminApplicationModel.objects.filter(status=value).order_by("created_at")
        return [self._to_entity(row) for row in rows]

    def set_status(
        self,
        application_id: int,
        *,
        status: AdminApplicationStatus | str,
        reviewed_by: int | None = None,
    ) -> AdminApplication | None:
        value = status.value if isinstance(status, AdminApplicationStatus) else status
        updated = AdminApplicationModel.objects.filter(pk=application_id).update(
            status=value,
            reviewed_by_id=reviewed_by,
            reviewed_at=timezone.now(),
            updated_at=timezone.now(),
        )
        if not updated:
            return None
        return self.get_by_id(application_id)

    @staticmethod
    def _to_entity(row: AdminApplicationModel) -> AdminApplication:
        nickname = row.user.nickname if row.user_id else ""
        return AdminApplication(
            id=row.pk,
            email=row.email,
            full_name=row.full_name,
            nickname=nickname,
            organization=row.organization,
            website=row.website,
            position=row.position,
            reason=row.reason,
            request_type=row.request_type,
            status=AdminApplicationStatus(row.status),
            reviewed_by=row.reviewed_by_id,
            reviewed_at=row.reviewed_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
            user_id=row.user_id,
        )
