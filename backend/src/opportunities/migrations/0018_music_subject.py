"""Add "music" as a subject under Arts & Design.

The key must match SUBJECT_TREE in ``src/opportunities/domain/entities.py`` and
SUBJECT_TREE in ``frontend/lib/constants.ts`` — the API derives its accepted
field keys from the former, the admin form renders the latter.
"""

from django.db import migrations

# (key, label_en, label_ar, color, sort_order) — appended after architecture.
# The labels match the existing "field.music" entry in frontend/lib/i18n.ts.
MUSIC = ("music", "Music", "موسيقى", "#DB2777", 7)


def seed_music(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    parent = OpportunityField.objects.filter(key="arts-design").first()
    if parent is None:
        return
    key, label_en, label_ar, color, order = MUSIC
    row, _ = OpportunityField.objects.get_or_create(
        key=key,
        defaults={
            "label_en": label_en,
            "label_ar": label_ar,
            "parent": parent,
            "color": color,
            "sort_order": order,
        },
    )
    if row.parent_id != parent.pk:
        row.parent = parent
        row.label_en = label_en
        row.label_ar = label_ar
        row.color = color
        row.sort_order = order
        row.save()


def unseed(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.filter(key="music").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0017_opportunitymodel_verified"),
    ]

    operations = [
        migrations.RunPython(seed_music, unseed),
    ]
