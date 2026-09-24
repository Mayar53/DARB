"""Add an optional social field to admin applications.

Non-destructive: ``social`` is a blank CharField, so existing rows keep an
empty value (they simply have no Telegram/social handle on file).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_rename_accounts_pa_email_used_idx_accounts_pa_email_5bd7dd_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="adminapplication",
            name="social",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
