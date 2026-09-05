"""Create PasswordResetCode for self-service password recovery.

Non-destructive additive migration. Codes are stored hashed with an expiry and
a used flag; no existing data is touched.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_adminapplication_request_type_roles"),
    ]

    operations = [
        migrations.CreateModel(
            name="PasswordResetCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("code_hash", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("used", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "password reset code",
                "verbose_name_plural": "password reset codes",
                "db_table": "accounts_password_reset_code",
            },
        ),
        migrations.AddIndex(
            model_name="passwordresetcode",
            index=models.Index(fields=["email", "used"], name="accounts_pa_email_used_idx"),
        ),
    ]
