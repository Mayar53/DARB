"""Re-link admin applications to the applicant's existing user account.

Adds a nullable ``user`` FK back onto AdminApplication (it was removed in 0007
when applications became standalone). Nullable + SET_NULL so existing rows are
untouched; new applications created by signed-in users carry the link. Also
switches the status vocabulary from ``rejected`` to ``waitlisted`` — existing
``rejected`` rows (if any) keep their value and remain valid.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_organization_adminapplication_position_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="adminapplication",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="admin_applications",
                to="accounts.usermodel",
            ),
        ),
    ]
