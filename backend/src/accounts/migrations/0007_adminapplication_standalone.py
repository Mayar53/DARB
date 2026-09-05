# Generated manually: converts AdminApplication from a user-linked record to a
# standalone application (stores email/full_name directly).

from django.db import migrations, models


def backfill_email_full_name(apps, schema_editor):
    AdminApplication = apps.get_model("accounts", "AdminApplication")
    UserModel = apps.get_model("accounts", "UserModel")
    for app in AdminApplication.objects.all().iterator():
        user = UserModel.objects.filter(pk=app.user_id).first()
        if user:
            app.email = user.email
            app.full_name = user.full_name
            app.save(update_fields=["email", "full_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_adminapplication_and_more"),
    ]

    operations = [
        # 1. Add nullable email/full_name so existing rows can be backfilled.
        migrations.AddField(
            model_name="adminapplication",
            name="email",
            field=models.EmailField(blank=True, db_index=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="adminapplication",
            name="full_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        # 2. Backfill from the linked user (rows created before this change).
        migrations.RunPython(backfill_email_full_name, migrations.RunPython.noop),
        # 3. Drop the user FK (the application is now standalone).
        migrations.RemoveField(
            model_name="adminapplication",
            name="user",
        ),
        # 4. Make the new fields required + unique.
        migrations.AlterField(
            model_name="adminapplication",
            name="email",
            field=models.EmailField(db_index=True, max_length=254, unique=True),
        ),
        migrations.AlterField(
            model_name="adminapplication",
            name="full_name",
            field=models.CharField(max_length=255),
        ),
    ]
