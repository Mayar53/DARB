"""Django admin (themed by django-unfold).

Passwords are edited through Django's standard ``UserChangeForm``, which
hashs the raw value with ``set_password`` before saving — the raw password is
never stored or echoed back. Users are created via the API or the owner
dashboard; the admin is for reviewing and adjusting existing accounts.
"""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm
from unfold.admin import ModelAdmin

from src.accounts.models import AdminApplication, UserModel


class UserAdminForm(UserChangeForm):
    """Standard Django user change form — safe password hashing."""

    class Meta(UserChangeForm.Meta):
        model = UserModel
        fields = "__all__"


@admin.register(UserModel)
class UserAdmin(ModelAdmin, DjangoUserAdmin):
    form = UserAdminForm
    list_display = (
        "id",
        "email",
        "full_name",
        "is_active",
        "is_staff",
        "is_superuser",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "is_superuser")
    search_fields = ("email", "full_name")
    ordering = ("id",)
    readonly_fields = ("last_login", "date_joined", "updated_at")
    # The owner's own dashboard handles creating admins; the admin here is for
    # reviewing existing accounts (and resetting passwords safely).
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),)
    fieldsets = (
        (None, {"fields": ("email", "password", "full_name", "nickname", "avatar")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "role", "permissions", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined", "updated_at")}),
    )


@admin.register(AdminApplication)
class AdminApplicationAdmin(ModelAdmin):
    list_display = (
        "id",
        "email",
        "full_name",
        "organization",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("email", "full_name", "organization")
    ordering = ("-created_at",)
    readonly_fields = ("email", "full_name", "organization", "reason", "created_at", "updated_at")
