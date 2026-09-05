"""Seed the canonical opportunity field/domain tags.

Each key must match the frontend FIELD_KEYS and the backend FIELD_KEYS tuple in
``src/opportunities/domain/entities.py``.
"""

from django.db import migrations

FIELDS = [
    ("general", "General", "عام"),
    ("chemistry", "Chemistry", "كيمياء"),
    ("physics", "Physics", "فيزياء"),
    ("biology", "Biology", "أحياء"),
    ("mathematics", "Mathematics", "رياضيات"),
    ("computer-science", "Computer Science", "علوم الحاسوب"),
    ("engineering", "Engineering", "هندسة"),
    ("medicine", "Medicine", "طب"),
    ("art", "Art", "فنون"),
    ("music", "Music", "موسيقى"),
    ("sports", "Sports", "رياضة"),
    ("literature", "Literature", "أدب"),
    ("business", "Business", "أعمال"),
    ("social-sciences", "Social Sciences", "علوم اجتماعية"),
]


def seed_fields(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.bulk_create(
        [
            OpportunityField(key=key, label_en=label_en, label_ar=label_ar)
            for key, label_en, label_ar in FIELDS
        ]
    )


def unseed_fields(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.filter(key__in=[f[0] for f in FIELDS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0003_opportunityfield_opportunitymodel_fields"),
    ]

    operations = [
        migrations.RunPython(seed_fields, unseed_fields),
    ]
