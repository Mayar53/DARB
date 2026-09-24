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

from src.accounts.models import AdminApplication, Organization, UserModel


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
    search_fields = ("email", "full_name", "organization", "social")
    ordering = ("-created_at",)
    readonly_fields = ("email", "full_name", "organization", "website", "social", "reason", "created_at", "updated_at")


@admin.register(Organization)
class OrganizationAdmin(ModelAdmin):
    """View and edit NGOs/organizations.

    Rows are created from approved org applications or by naming one on an
    opportunity, and there was no editing path anywhere until this was
    registered — a typo in a name could not be fixed.
    """

    list_display = ("id", "name", "website", "created_at", "updated_at")
    search_fields = ("name", "website", "description")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
