"""Persistence adapter: the Django ORM model for users.

This is the only place that knows about Django's ORM. The domain works with the
``User`` entity; the repository maps between the two.
"""

from __future__ import annotations

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if extra.get("is_staff") is not True or extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True")
        return self._create(email, password, **extra)


class UserModel(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        USER = "user", "User"
        ADMIN = "admin", "Admin"
        OWNER = "owner", "Owner"
        RESEARCHER = "researcher", "Researcher"
        ORG_ADMIN = "org_admin", "Organization Admin"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    # Public-facing name shown on stories (first name / nickname). Kept
    # separate from full_name so the full identity is never public.
    nickname = models.CharField(max_length=64, blank=True)
    # Emoji avatar shown next to the nickname (privacy-safe, no photos).
    avatar = models.CharField(max_length=8, blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    # High-level role: "user" | "admin" | "owner". Backend-enforced.
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    # Permission keys assigned to this user (owner effectively has all).
    permissions = models.JSONField(default=list, blank=True)
    # Gamification: denormalised points + badges, refreshed by recompute.
    points = models.PositiveIntegerField(default=0)
    badges = models.JSONField(default=list, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Organizations/NGOs this user is assigned to (admins; owner manages).
    organizations = models.ManyToManyField(
        "accounts.Organization",
        related_name="members",
        blank=True,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        app_label = "accounts"
        db_table = "accounts_user"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self) -> str:
        return self.email
