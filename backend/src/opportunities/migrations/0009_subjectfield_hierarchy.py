"""Add hierarchy columns (parent/color/sort_order) to OpportunityField and seed the subject tree.

Additive: existing OpportunityField rows and opportunity M2M links are preserved.
The tree keys must match SUBJECT_TREE in ``src/opportunities/domain/entities.py``.
"""

from django.db import migrations, models

# (key, label_en, label_ar, parent_key or None, color, sort_order)
SUBJECT_ROWS = [
    # Top-level subjects.
    ("general", "General", "عام", None, "#6B7280", 0),
    ("science", "Science", "علوم", None, "#0F766E", 1),
    ("business", "Business", "أعمال", None, "#4D7C0F", 2),
    ("technology", "Technology", "تكنولوجيا", None, "#0369A1", 3),
    ("art-design", "Art & Design", "فنون وتصميم", None, "#C026D3", 4),
    ("social-sciences", "Social Sciences", "علوم اجتماعية", None, "#9F1239", 5),
    ("engineering", "Engineering", "هندسة", None, "#B45309", 6),
    ("medicine", "Medicine", "طب", None, "#BE123C", 7),
    ("health", "Health", "صحة", None, "#15803D", 8),
    ("environment", "Environment", "بيئة", None, "#4D7C0F", 9),
    ("stem", "STEM", "ستيم", None, "#0F766E", 10),
    ("ai", "AI", "ذكاء اصطناعي", None, "#7C3AED", 11),
    ("coding", "Coding", "برمجة", None, "#0369A1", 12),
    ("computer-science", "Computer Science", "علوم الحاسوب", None, "#0369A1", 13),
    ("music", "Music", "موسيقى", None, "#7C3AED", 14),
    ("sports", "Sports", "رياضة", None, "#EA580C", 15),
    ("literature", "Literature", "أدب", None, "#A21CAF", 16),
    ("design", "Design", "تصميم", None, "#C026D3", 17),
    ("culture", "Culture", "ثقافة", None, "#A16207", 18),
    ("education", "Education", "تعليم", None, "#0369A1", 19),
    ("research", "Research", "بحث", None, "#4338CA", 20),
    ("social-impact", "Social Impact", "أثر اجتماعي", None, "#C0533D", 21),
    ("leadership", "Leadership", "قيادة", None, "#B45309", 22),
    # Science children.
    ("chemistry", "Chemistry", "كيمياء", "science", "#0F766E", 0),
    ("physics", "Physics", "فيزياء", "science", "#4338CA", 1),
    ("biology", "Biology", "أحياء", "science", "#15803D", 2),
    ("mathematics", "Mathematics", "رياضيات", "science", "#A16207", 3),
    # Business children.
    ("accounting", "Accounting", "محاسبة", "business", "#4D7C0F", 0),
    ("marketing", "Marketing", "تسويق", "business", "#C026D3", 1),
    ("finance", "Finance", "تمويل", "business", "#047857", 2),
    ("entrepreneurship", "Entrepreneurship", "ريادة أعمال", "business", "#B45309", 3),
    # Technology children.
    ("programming", "Programming", "برمجة", "technology", "#0369A1", 0),
    ("ai-ml", "AI / ML", "ذكاء اصطناعي / تعلم آلة", "technology", "#7C3AED", 1),
    ("cybersecurity", "Cybersecurity", "أمن سيبراني", "technology", "#0F766E", 2),
    ("data-science", "Data Science", "علم البيانات", "technology", "#4338CA", 3),
    ("robotics", "Robotics", "روبوتات", "technology", "#BE123C", 4),
    # Art & Design children.
    ("graphic-design", "Graphic Design", "تصميم جرافيك", "art-design", "#C026D3", 0),
    ("illustration", "Illustration", "رسم توضيحي", "art-design", "#A21CAF", 1),
    ("photography", "Photography", "تصوير", "art-design", "#B45309", 2),
    ("ui-ux", "UI/UX", "تجربة وواجهة المستخدم", "art-design", "#7C3AED", 3),
    ("animation", "Animation", "رسوم متحركة", "art-design", "#EA580C", 4),
    # Social Sciences children.
    ("psychology", "Psychology", "علم نفس", "social-sciences", "#9F1239", 0),
    ("sociology", "Sociology", "علم اجتماع", "social-sciences", "#0F766E", 1),
    ("political-science", "Political Science", "علوم سياسية", "social-sciences", "#4338CA", 2),
    ("international-relations", "International Relations", "علاقات دولية", "social-sciences", "#0369A1", 3),
    # Existing legacy keys preserved as top-level (were seeded by 0004/0008).
    ("art", "Art", "فنون", None, "#C026D3", 23),
]


def seed_subject_tree(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    by_key = {}
    # First pass: parents (no parent ref) so child FK lookups resolve.
    for key, label_en, label_ar, parent, color, sort_order in SUBJECT_ROWS:
        if parent is None:
            row, _ = OpportunityField.objects.get_or_create(
                key=key,
                defaults={"label_en": label_en, "label_ar": label_ar, "color": color, "sort_order": sort_order},
            )
            # Existing rows (from earlier seeds) may predate the new columns —
            # refresh their metadata so the tree is consistent.
            updated = False
            if row.label_en != label_en:
                row.label_en = label_en
                updated = True
            if row.label_ar != label_ar:
                row.label_ar = label_ar
                updated = True
            if row.color != color:
                row.color = color
                updated = True
            if row.sort_order != sort_order:
                row.sort_order = sort_order
                updated = True
            if updated:
                row.save()
            by_key[key] = row
    # Second pass: children.
    for key, label_en, label_ar, parent, color, sort_order in SUBJECT_ROWS:
        if parent is not None:
            parent_row = by_key.get(parent)
            row, _ = OpportunityField.objects.get_or_create(
                key=key,
                defaults={
                    "label_en": label_en,
                    "label_ar": label_ar,
                    "parent": parent_row,
                    "color": color,
                    "sort_order": sort_order,
                },
            )
            # Existing child rows: ensure the parent link is set.
            changed = False
            if row.parent_id != (parent_row.pk if parent_row else None):
                row.parent = parent_row
                changed = True
            if row.color != color:
                row.color = color
                changed = True
            if row.label_en != label_en:
                row.label_en = label_en
                changed = True
            if row.label_ar != label_ar:
                row.label_ar = label_ar
                changed = True
            if changed:
                row.save()
            by_key[key] = row


def unseed(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    OpportunityField.objects.filter(key__in=[r[0] for r in SUBJECT_ROWS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0008_seed_field_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="opportunityfield",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name="children",
                to="opportunities.opportunityfield",
            ),
        ),
        migrations.AddField(
            model_name="opportunityfield",
            name="color",
            field=models.CharField(default="#0E4749", max_length=16),
        ),
        migrations.AddField(
            model_name="opportunityfield",
            name="sort_order",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(seed_subject_tree, unseed),
    ]
