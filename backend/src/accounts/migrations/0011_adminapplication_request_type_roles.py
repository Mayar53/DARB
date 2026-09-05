"""Add request_type to admin applications + new admin roles.

Non-destructive: ``request_type`` defaults to "admin" (the existing behavior)
so current rows are treated as research/admin applications. Roles are just
CharField choices — no column change, existing users keep their values.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_adminapplication_user_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="adminapplication",
            name="request_type",
            field=models.CharField(
                choices=[("admin", "Admin / Researcher"), ("org", "Organization Admin")],
                default="admin",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="usermodel",
            name="role",
            field=models.CharField(
                choices=[
                    ("user", "User"),
                    ("admin", "Admin"),
                    ("owner", "Owner"),
                    ("researcher", "Researcher"),
                    ("org_admin", "Organization Admin"),
                ],
                default="user",
                max_length=16,
            ),
        ),
    ]
