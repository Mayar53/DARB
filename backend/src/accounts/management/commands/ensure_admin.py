"""Idempotently ensure the default admin superuser exists.

Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME from settings (env). Safe to
run on every boot — the Docker entrypoint calls it, and a data migration creates
it on the first `migrate`.
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from src.accounts.adapters.outbound.orm_models import UserModel
from src.accounts.domain.permissions import OWNER_PERMISSIONS


class Command(BaseCommand):
    help = "Create or update the default admin superuser from settings/env."

    def handle(self, *args, **options) -> None:
        email = (settings.ADMIN_EMAIL or "").strip()
        if not email:
            self.stdout.write(
                self.style.WARNING("ADMIN_EMAIL is not set — no admin created. Set it in the environment to bootstrap the first admin.")
            )
            return
        password = settings.ADMIN_PASSWORD or ""
        full_name = (settings.ADMIN_FULL_NAME or "Administrator").strip()
        user, created = UserModel.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name},
        )
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.email = email
        # The first bootstrap admin becomes the OWNER (single-owner invariant).
        if not UserModel.objects.filter(role=UserModel.Role.OWNER).exclude(pk=user.pk).exists():
            user.role = UserModel.Role.OWNER
            user.permissions = OWNER_PERMISSIONS
        if not user.full_name:
            user.full_name = full_name
        if password:
            user.set_password(password)
        user.save()
        self.stdout.write(
            self.style.SUCCESS(f"Admin {'created' if created else 'updated'}: {email}")
        )
