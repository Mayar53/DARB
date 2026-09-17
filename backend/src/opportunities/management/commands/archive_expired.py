"""Archive opportunities whose deadline has passed.

Run manually or on a schedule (e.g. a Render cron job):

    python manage.py archive_expired

This flips expired *published* opportunities to ``archived`` so they drop out of
the public site and sit in the admin "past" bucket. The public listing already
hides expired opportunities dynamically, so this is an optional tidy-up that
keeps the stored status honest.
"""

from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand

from src.opportunities.adapters.outbound.orm_models import OpportunityModel


class Command(BaseCommand):
    help = "Archive published opportunities whose deadline has passed."

    def handle(self, *args, **options) -> None:
        today = date.today()
        expired = OpportunityModel.objects.filter(
            status="published",
            deadline__isnull=False,
            deadline__lt=today,
        )
        count = expired.update(status="archived", is_active=False)
        self.stdout.write(
            self.style.SUCCESS(f"Archived {count} expired opportunit{'y' if count == 1 else 'ies'}.")
        )
