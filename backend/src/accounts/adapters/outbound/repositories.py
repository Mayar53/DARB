"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from src.accounts.adapters.outbound.orm_models import UserModel
from src.accounts.domain.entities import User
from src.accounts.domain.permissions import DEFAULT_ADMIN_PERMISSIONS
from src.accounts.domain.ports import UserRepository


class DjangoUserRepository(UserRepository):
    def get_by_id(self, user_id: int) -> User | None:
        row = UserModel.objects.filter(pk=user_id).first()
        return self._to_entity(row) if row else None

    def get_by_email(self, email: str) -> User | None:
        row = UserModel.objects.filter(email__iexact=email).first()
        return self._to_entity(row) if row else None

    def exists_by_email(self, email: str) -> bool:
        return UserModel.objects.filter(email__iexact=email).exists()

    def add(self, *, email: str, full_name: str, password_hash: str, nickname: str = "") -> User:
        # ``password`` stores the hash produced by the PasswordHasher port, which
        # is a valid Django password hash, so admin login stays compatible.
        row = UserModel.objects.create(
            email=email,
            full_name=full_name,
            password=password_hash,
            nickname=nickname,
            role=UserModel.Role.USER,
        )
        return self._to_entity(row)

    def add_admin(self, *, email: str, full_name: str, password_hash: str, nickname: str = "", permissions: list[str] | None = None) -> User:
        row = UserModel.objects.create(
            email=email,
            full_name=full_name,
            password=password_hash,
            nickname=nickname,
            is_staff=True,
            is_superuser=True,
            role=UserModel.Role.ADMIN,
            permissions=permissions or DEFAULT_ADMIN_PERMISSIONS,
        )
        return self._to_entity(row)

    def list_admins(self) -> list[User]:
        rows = UserModel.objects.filter(is_staff=True)
        return [self._to_entity(row) for row in rows]

    def list_staff_without_application(self) -> list[User]:
        """Staff/admin users who have no admin application record.

        These are admins who registered or were created directly without going
        through the application flow. They surface to the OWNER as new
        applications so the owner can formally approve/decline/waitlist them.
        """
        rows = UserModel.objects.filter(
            is_staff=True,
            admin_applications__isnull=True,
        ).exclude(role=UserModel.Role.OWNER)
        return [self._to_entity(row) for row in rows]

    def list_users(self) -> list[User]:
        rows = UserModel.objects.all().order_by("id")
        return [self._to_entity(row) for row in rows]

    def update_profile(self, user_id: int, *, nickname: str | None = None, avatar: str | None = None) -> User | None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return None
        if nickname is not None:
            row.nickname = nickname
        if avatar is not None:
            row.avatar = avatar
        row.save(update_fields=["nickname", "avatar", "updated_at"])
        return self._to_entity(row)

    def set_staff(self, user_id: int, *, is_staff: bool, is_superuser: bool) -> User | None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return None
        row.is_staff = is_staff
        row.is_superuser = is_superuser
        row.save(update_fields=["is_staff", "is_superuser", "updated_at"])
        return self._to_entity(row)

    def set_role(self, user_id: int, *, role: str, permissions: list[str] | None = None) -> User | None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return None
        row.role = role
        row.is_staff = role in ("admin", "owner", "researcher", "org_admin")
        if permissions is not None:
            row.permissions = permissions
        row.save(update_fields=["role", "permissions", "is_staff", "updated_at"])
        return self._to_entity(row)

    def update_admin(self, user_id: int, *, is_active: bool | None = None, permissions: list[str] | None = None) -> User | None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return None
        if is_active is not None:
            row.is_active = is_active
        if permissions is not None:
            row.permissions = permissions
        row.save(update_fields=["is_active", "permissions", "updated_at"])
        return self._to_entity(row)

    def update_password(self, user_id: int, new_password: str) -> User | None:
        """Set a new password (hashed via Django's configured hashers)."""
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return None
        row.set_password(new_password)
        row.save(update_fields=["password", "updated_at"])
        return self._to_entity(row)

    def assign_organization(self, user_id: int, organization_id: int) -> None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return
        row.organizations.add(organization_id)

    def set_organizations(self, user_id: int, organization_ids: list[int]) -> None:
        row = UserModel.objects.filter(pk=user_id).first()
        if row is None:
            return
        row.organizations.set(organization_ids)

    @staticmethod
    def _to_entity(row: UserModel) -> User:
        return User(
            id=row.pk,
            email=row.email,
            full_name=row.full_name,
            nickname=row.nickname,
            avatar=row.avatar,
            is_active=row.is_active,
            is_staff=row.is_staff,
            role=row.role,
            permissions=list(row.permissions or []),
            points=row.points,
            badges=list(row.badges or []),
            password_hash=row.password,
            created_at=row.date_joined,
            updated_at=row.updated_at,
        )
