"""Create the default admin superuser on the first migrate (init)."""

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_admin(apps, schema_editor):
    UserModel = apps.get_model("accounts", "UserModel")
    email = getattr(settings, "ADMIN_EMAIL", "")
    if not email:
        return
    if UserModel.objects.filter(email=email).exists():
        return
    UserModel.objects.create(
        email=email,
        full_name=getattr(settings, "ADMIN_FULL_NAME", "Administrator"),
        password=make_password(getattr(settings, "ADMIN_PASSWORD", "")),
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


def remove_admin(apps, schema_editor):
    UserModel = apps.get_model("accounts", "UserModel")
    UserModel.objects.filter(email=getattr(settings, "ADMIN_EMAIL", "admin@admin.com")).delete()


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]
    operations = [migrations.RunPython(create_admin, remove_admin)]
