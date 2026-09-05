"""Remove the auto-seeded demo admin superuser.

Per the new admin model there is no default admin account. The first admin is
bootstrap-created by the operator via `manage.py ensure_admin` (env-configured
ADMIN_EMAIL) or `createsuperuser`. This migration deletes the previously seeded
`admin@admin.com` so fresh installs have no demo credentials.
"""

from django.db import migrations


def remove_seeded_admin(apps, schema_editor):
    UserModel = apps.get_model("accounts", "UserModel")
    # The old seed created admin@admin.com, but with ADMIN_EMAIL now defaulting
    # to empty it could also have created an empty-email staff user. Remove both.
    UserModel.objects.filter(email="admin@admin.com").delete()
    UserModel.objects.filter(email="", is_staff=True).delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_adminapplication_standalone"),
    ]

    operations = [
        migrations.RunPython(remove_seeded_admin, noop),
    ]
