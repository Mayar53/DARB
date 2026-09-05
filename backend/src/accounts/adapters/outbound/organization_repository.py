"""Persistence adapter: Django ORM implementation of OrganizationRepository."""

from __future__ import annotations

from src.accounts.adapters.outbound.organization_models import Organization as OrganizationModel
from src.accounts.domain.entities import Organization
from src.accounts.domain.ports import OrganizationRepository


class DjangoOrganizationRepository(OrganizationRepository):
    def create(self, *, name: str, website: str = "", description: str = "") -> Organization:
        row, _ = OrganizationModel.objects.get_or_create(
            name=name.strip(),
            defaults={"website": website.strip(), "description": description.strip()},
        )
        return self._to_entity(row)

    def get_by_id(self, organization_id: int) -> Organization | None:
        row = OrganizationModel.objects.filter(pk=organization_id).first()
        return self._to_entity(row) if row else None

    def get_by_name(self, name: str) -> Organization | None:
        row = OrganizationModel.objects.filter(name__iexact=name.strip()).first()
        return self._to_entity(row) if row else None

    def list_all(self) -> list[Organization]:
        return [self._to_entity(row) for row in OrganizationModel.objects.all()]

    @staticmethod
    def _to_entity(row: OrganizationModel) -> Organization:
        return Organization(
            id=row.pk,
            name=row.name,
            website=row.website,
            description=row.description,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
