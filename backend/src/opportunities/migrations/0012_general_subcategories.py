"""Add subcategories under the "general" subject.

The keys must match SUBJECT_TREE in ``src/opportunities/domain/entities.py``.
"""

from django.db import migrations

GENERAL_CHILDREN = [
    ("general-interest", "General Interest", "اهتمامات عامة", "#6B7280", 0),
    ("lifestyle", "Lifestyle & Hobbies", "أسلوب الحياة والهوايات", "#A16207", 1),
    ("community", "Community & Networking", "المجتمع والتواصل", "#0E4749", 2),
    ("everyday", "Everyday Life", "الحياة اليومية", "#5C5C5C", 3),
    ("career-work", "Career & Work", "المهنة والعمل", "#0369A1", 4),
    ("family", "Family & Personal", "العائلة والشخصي", "#C0533D", 5),
]


def seed_general_children(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    parent = OpportunityField.objects.filter(key="general").first()
    if parent is None:
        return
    for key, en, ar, color, order in GENERAL_CHILDREN:
        row, _ = OpportunityField.objects.get_or_create(
            key=key,
            defaults={
                "label_en": en,
                "label_ar": ar,
                "parent": parent,
                "color": color,
                "sort_order": order,
            },
        )
        if row.parent_id != parent.pk:
            row.parent = parent
            row.color = color
            row.label_en = en
            row.label_ar = ar
            row.save()


def unseed(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.filter(key__in=[c[0] for c in GENERAL_CHILDREN]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0011_restructure_subject_tree"),
    ]

    operations = [
        migrations.RunPython(seed_general_children, unseed),
    ]
