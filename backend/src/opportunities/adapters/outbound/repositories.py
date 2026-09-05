"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from django.db import models

from src.opportunities.adapters.outbound.orm_models import OpportunityField, OpportunityModel
from src.opportunities.domain.entities import Opportunity
from src.opportunities.domain.ports import OpportunityRepository


class DjangoOpportunityRepository(OpportunityRepository):
    def _queryset(self):
        return OpportunityModel.objects.select_related("created_by", "organization").prefetch_related(
            "fields"
        )

    def list_all(self, *, include_inactive: bool = False) -> list[Opportunity]:
        qs = self._queryset().all()
        if not include_inactive:
            qs = qs.filter(status="published")
        return [self._to_entity(row) for row in qs]

    def list_by_owner(self, owner_id: int) -> list[Opportunity]:
        rows = self._queryset().filter(created_by_id=owner_id)
        return [self._to_entity(row) for row in rows]

    def get_by_id(self, opportunity_id: int) -> Opportunity | None:
        row = self._queryset().filter(pk=opportunity_id).first()
        return self._to_entity(row) if row else None

    def add(
        self,
        *,
        category: str,
        title: str,
        description: str,
        location: str,
        mode: str,
        duration: str,
        funding: str,
        price: str = "",
        deadline,
        apply_url: str,
        is_active: bool | None = None,
        created_by: int | None,
        status: str = "published",
        organization: int | None = None,
        age: str = "all",
        certificate: bool = False,
        fields: list[str] | None = None,
        title_ar: str | None = None,
        title_en: str | None = None,
        description_ar: str | None = None,
        description_en: str | None = None,
    ) -> Opportunity:
        row = OpportunityModel.objects.create(
            category=category,
            title=title,
            description=description,
            title_ar=title_ar,
            title_en=title_en,
            description_ar=description_ar,
            description_en=description_en,
            location=location,
            mode=mode,
            duration=duration,
            funding=funding,
            price=price,
            deadline=deadline,
            apply_url=apply_url,
            status=status,
            is_active=status == "published" if is_active is None else is_active,
            created_by_id=created_by,
            organization_id=organization,
            age=age,
            certificate=certificate,
        )
        if fields:
            row.fields.set(OpportunityField.objects.filter(key__in=fields))
        return self._to_entity(row)

    def update(self, opportunity: Opportunity, **fields) -> Opportunity:
        row = OpportunityModel.objects.filter(pk=opportunity.id).first()
        if row is None:
            return opportunity
        m2m = fields.pop("fields", None)
        for key, value in fields.items():
            # Foreign key fields arrive as ids; assign via *_id to avoid
            # Django requiring a model instance.
            if key == "organization":
                row.organization_id = value
            else:
                setattr(row, key, value)
        if "status" in fields:
            row.is_active = fields["status"] == "published"
        row.save()
        if m2m is not None:
            row.fields.set(OpportunityField.objects.filter(key__in=m2m))
        return self._to_entity(row)

    def delete(self, opportunity_id: int) -> None:
        OpportunityModel.objects.filter(pk=opportunity_id).delete()

    def increment_apply_clicks(self, opportunity_id: int) -> None:
        OpportunityModel.objects.filter(pk=opportunity_id).update(
            apply_clicks=models.F("apply_clicks") + 1
        )

    def increment_views(self, opportunity_id: int) -> None:
        OpportunityModel.objects.filter(pk=opportunity_id).update(
            views=models.F("views") + 1
        )

    def list_subject_fields(self) -> list[dict]:
        rows = OpportunityField.objects.all()
        return [
            {
                "key": row.key,
                "label_en": row.label_en,
                "label_ar": row.label_ar,
                "parent": row.parent.key if row.parent_id else None,
                "color": row.color,
            }
            for row in rows
        ]

    def bulk_add(self, items: list[dict]) -> list[Opportunity]:
        rows = [OpportunityModel(**{k: v for k, v in item.items() if k != "fields"}) for item in items]
        for item, row in zip(items, rows):
            if "status" in item:
                row.is_active = item["status"] == "published"
        OpportunityModel.objects.bulk_create(rows)
        for item, row in zip(items, rows):
            if item.get("fields"):
                row.fields.set(OpportunityField.objects.filter(key__in=item["fields"]))
        created = OpportunityModel.objects.filter(
            pk__in=[r.pk for r in rows]
        ).select_related("created_by", "organization").prefetch_related("fields")
        return [self._to_entity(row) for row in created]

    @staticmethod
    def _to_entity(row: OpportunityModel) -> Opportunity:
        return Opportunity(
            id=row.pk,
            category=row.category,
            title=row.title,
            description=row.description,
            title_ar=row.title_ar,
            title_en=row.title_en,
            description_ar=row.description_ar,
            description_en=row.description_en,
            location=row.location,
            mode=row.mode,
            duration=row.duration,
            funding=row.funding,
            price=row.price,
            deadline=row.deadline,
            apply_url=row.apply_url,
            status=row.status,
            created_by=row.created_by_id,
            created_by_name=row.created_by.full_name if row.created_by else "",
            organization=row.organization_id,
            organization_name=row.organization.name if row.organization else "",
            organization_website=row.organization.website if row.organization else "",
            age=row.age,
            certificate=row.certificate,
            apply_clicks=row.apply_clicks,
            views=row.views,
            fields=[f.key for f in row.fields.all()],
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
