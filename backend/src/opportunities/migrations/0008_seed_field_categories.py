"""Add the field-based category tags (Science, STEM, AI, Coding, etc.).

Additive only: existing OpportunityField rows and opportunity M2M links are
untouched. The keys must match FIELD_KEYS in
``src/opportunities/domain/entities.py``.
"""

from django.db import migrations

NEW_FIELDS = [
    ("science", "Science", "علوم"),
    ("stem", "STEM", "ستيم"),
    ("technology", "Technology", "تكنولوجيا"),
    ("ai", "AI", "ذكاء اصطناعي"),
    ("coding", "Coding", "برمجة"),
    ("health", "Health", "صحة"),
    ("environment", "Environment", "بيئة"),
    ("design", "Design", "تصميم"),
    ("entrepreneurship", "Entrepreneurship", "ريادة أعمال"),
    ("leadership", "Leadership", "قيادة"),
    ("education", "Education", "تعليم"),
    ("research", "Research", "بحث"),
    ("culture", "Culture", "ثقافة"),
    ("social-impact", "Social Impact", "أثر اجتماعي"),
]


def seed_new_fields(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    existing = set(OpportunityField.objects.values_list("key", flat=True))
    OpportunityField.objects.bulk_create(
        [
            OpportunityField(key=key, label_en=en, label_ar=ar)
            for key, en, ar in NEW_FIELDS
            if key not in existing
        ]
    )


def unseed(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.filter(key__in=[f[0] for f in NEW_FIELDS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0007_opportunitymodel_views"),
    ]

    operations = [
        migrations.RunPython(seed_new_fields, unseed),
    ]
