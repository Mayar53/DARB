"""Promote an existing account to the single OWNER role (one-time bootstrap).

Usage:  python manage.py promote_owner <email>

This is the ONLY secure path to OWNER. There is no public/API endpoint for it.
The account must already exist (it is usually the site owner's personal
account); it is then given role=owner, is_staff=True, is_superuser=True and
the full permission set. A second owner is refused.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from src.accounts.adapters.outbound.orm_models import UserModel
from src.accounts.domain.permissions import OWNER_PERMISSIONS


class Command(BaseCommand):
    help = "Promote an existing account to the single OWNER role."

    def add_arguments(self, parser) -> None:
        parser.add_argument("email", type=str, help="Email of the existing account to promote.")

    def handle(self, *args, **options) -> None:
        email = (options["email"] or "").strip().lower()
        if not email:
            raise CommandError("Provide the email of the account to promote.")

        existing_owner = UserModel.objects.filter(role=UserModel.Role.OWNER).first()
        if existing_owner is not None and existing_owner.email.lower() != email:
            raise CommandError(
                f"An OWNER already exists ({existing_owner.email}). Refusing to create a second owner."
            )

        user = UserModel.objects.filter(email__iexact=email).first()
        if user is None:
            raise CommandError(
                f"No account found for {email}. Register it first (personal account), then re-run."
            )

        user.role = UserModel.Role.OWNER
        user.is_staff = True
        user.is_superuser = True
        user.permissions = OWNER_PERMISSIONS
        user.save()
        self.stdout.write(self.style.SUCCESS(f"OWNER set: {user.email} (role=owner, full permissions)"))
