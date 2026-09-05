"""Restructure the subject tree: small number of broad parents with detailed
subcategories (STEM → Science/Engineering/Technology → sub-subcategories).

Additive + corrective: existing OpportunityField rows are updated in place
(parent links, colors, labels) and new subcategory rows are created. The keys
must match SUBJECT_TREE in ``src/opportunities/domain/entities.py``.
"""

from django.db import migrations

# (key, label_en, label_ar, parent_key or None, color, sort_order)
# A parent_key of "stem" means the row hangs under the STEM group; rows with
# parent_key None are the top-level broad groups.
SUBJECT_ROWS = [
    # Broad parent groups
    ("stem", "STEM", "ستيم", None, "#0F766E", 0),
    ("business-economics", "Business & Economics", "أعمال واقتصاد", None, "#4D7C0F", 1),
    ("arts-design", "Arts & Design", "فنون وتصميم", None, "#C026D3", 2),
    ("social-humanities", "Social Sciences & Humanities", "علوم اجتماعية وإنسانية", None, "#9F1239", 3),
    ("social-impact-community", "Social Impact & Community", "أثر اجتماعي ومجتمع", None, "#C0533D", 4),
    ("education-development", "Education & Personal Development", "تعليم وتطوير شخصي", None, "#A16207", 5),
    ("general", "General", "عام", None, "#6B7280", 6),
    # STEM → Science
    ("science", "Science", "علوم", "stem", "#0F766E", 0),
    ("biology", "Biology", "أحياء", "science", "#15803D", 0),
    ("chemistry", "Chemistry", "كيمياء", "science", "#0F766E", 1),
    ("physics", "Physics", "فيزياء", "science", "#4338CA", 2),
    ("mathematics", "Mathematics", "رياضيات", "science", "#A16207", 3),
    ("environmental-science", "Environmental Science", "علوم بيئية", "science", "#4D7C0F", 4),
    # STEM → Engineering
    ("engineering", "Engineering", "هندسة", "stem", "#B45309", 1),
    ("mechanical", "Mechanical", "ميكانيكية", "engineering", "#B45309", 0),
    ("electrical", "Electrical", "كهربائية", "engineering", "#D97706", 1),
    ("civil", "Civil", "مدنية", "engineering", "#A16207", 2),
    ("chemical", "Chemical", "كيميائية", "engineering", "#0F766E", 3),
    ("biomedical", "Biomedical", "طبية حيوية", "engineering", "#BE123C", 4),
    # STEM → Technology
    ("technology", "Technology", "تكنولوجيا", "stem", "#0369A1", 2),
    ("computer-science", "Computer Science", "علوم الحاسوب", "technology", "#0369A1", 0),
    ("ai-ml", "AI / ML", "ذكاء اصطناعي / تعلم آلة", "technology", "#7C3AED", 1),
    ("coding", "Coding & Programming", "برمجة", "technology", "#0369A1", 2),
    ("software-development", "Software Development", "تطوير برمجيات", "technology", "#4338CA", 3),
    ("cybersecurity", "Cybersecurity", "أمن سيبراني", "technology", "#0F766E", 4),
    ("data-science", "Data Science", "علم البيانات", "technology", "#4338CA", 5),
    ("robotics", "Robotics", "روبوتات", "technology", "#BE123C", 6),
    # Business & Economics
    ("entrepreneurship", "Entrepreneurship", "ريادة أعمال", "business-economics", "#B45309", 0),
    ("marketing", "Marketing", "تسويق", "business-economics", "#C026D3", 1),
    ("finance", "Finance", "تمويل", "business-economics", "#047857", 2),
    ("accounting", "Accounting", "محاسبة", "business-economics", "#4D7C0F", 3),
    ("management", "Management", "إدارة", "business-economics", "#0F766E", 4),
    ("economics", "Economics", "اقتصاد", "business-economics", "#A16207", 5),
    ("hr", "HR", "موارد بشرية", "business-economics", "#0369A1", 6),
    # Arts & Design
    ("graphic-design", "Graphic Design", "تصميم جرافيك", "arts-design", "#C026D3", 0),
    ("ui-ux", "UI/UX", "تجربة وواجهة المستخدم", "arts-design", "#7C3AED", 1),
    ("illustration", "Illustration", "رسم توضيحي", "arts-design", "#A21CAF", 2),
    ("photography", "Photography", "تصوير", "arts-design", "#B45309", 3),
    ("film-media", "Film / Media", "سينما وإعلام", "arts-design", "#EA580C", 4),
    ("fine-arts", "Fine Arts", "فنون جميلة", "arts-design", "#C026D3", 5),
    ("architecture", "Architecture", "عمارة", "arts-design", "#A16207", 6),
    # Social Sciences & Humanities
    ("psychology", "Psychology", "علم نفس", "social-humanities", "#9F1239", 0),
    ("sociology", "Sociology", "علم اجتماع", "social-humanities", "#0F766E", 1),
    ("political-science", "Political Science", "علوم سياسية", "social-humanities", "#4338CA", 2),
    ("international-relations", "International Relations", "علاقات دولية", "social-humanities", "#0369A1", 3),
    ("law", "Law", "قانون", "social-humanities", "#B45309", 4),
    ("history", "History", "تاريخ", "social-humanities", "#A16207", 5),
    ("philosophy", "Philosophy", "فلسفة", "social-humanities", "#7C3AED", 6),
    ("languages", "Languages", "لغات", "social-humanities", "#C026D3", 7),
    # Social Impact & Community
    ("volunteering", "Volunteering", "تطوع", "social-impact-community", "#0E4749", 0),
    ("human-rights", "Human Rights", "حقوق إنسان", "social-impact-community", "#BE123C", 1),
    ("sustainability", "Sustainability", "استدامة", "social-impact-community", "#15803D", 2),
    ("environment", "Environment", "بيئة", "social-impact-community", "#4D7C0F", 3),
    ("advocacy", "Advocacy", "مناصرة", "social-impact-community", "#EA580C", 4),
    ("community-development", "Community Development", "تنمية مجتمعية", "social-impact-community", "#047857", 5),
    # Education & Personal Development
    ("leadership", "Leadership", "قيادة", "education-development", "#B45309", 0),
    ("public-speaking", "Public Speaking", "تحدث أمام الجمهور", "education-development", "#7C3AED", 1),
    ("career-development", "Career Development", "تطوير مهني", "education-development", "#0369A1", 2),
    ("personal-development", "Personal Development", "تنمية ذاتية", "education-development", "#C026D3", 3),
    ("languages-learning", "Languages Learning", "تعلم اللغات", "education-development", "#A16207", 4),
]


def seed_subject_tree(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    by_key = {}

    # First pass: top-level broad groups (parent is None).
    for key, label_en, label_ar, parent, color, sort_order in SUBJECT_ROWS:
        if parent is not None:
            continue
        row, _ = OpportunityField.objects.get_or_create(
            key=key,
            defaults={"label_en": label_en, "label_ar": label_ar, "color": color, "sort_order": sort_order},
        )
        # Refresh metadata on existing rows and detach any stale parent link.
        changed = False
        if row.label_en != label_en:
            row.label_en = label_en
            changed = True
        if row.label_ar != label_ar:
            row.label_ar = label_ar
            changed = True
        if row.color != color:
            row.color = color
            changed = True
        if row.sort_order != sort_order:
            row.sort_order = sort_order
            changed = True
        if row.parent_id is not None:
            row.parent = None
            changed = True
        if changed:
            row.save()
        by_key[key] = row

    # Second pass: everything else (parent is a key already in by_key).
    for key, label_en, label_ar, parent, color, sort_order in SUBJECT_ROWS:
        if parent is None:
            continue
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
        changed = False
        if row.parent_id != (parent_row.pk if parent_row else None):
            row.parent = parent_row
            changed = True
        if row.label_en != label_en:
            row.label_en = label_en
            changed = True
        if row.label_ar != label_ar:
            row.label_ar = label_ar
            changed = True
        if row.color != color:
            row.color = color
            changed = True
        if row.sort_order != sort_order:
            row.sort_order = sort_order
            changed = True
        if changed:
            row.save()
        by_key[key] = row

    # Reparent legacy top-level rows that opportunities already reference
    # (ai, business, social-sciences) under the new broad groups so they never
    # surface as top-level pills, while preserving their M2M links.
    REPARENT = {
        "ai": "technology",
        "business": "business-economics",
        "social-sciences": "social-humanities",
    }
    for key, new_parent in REPARENT.items():
        row = OpportunityField.objects.filter(key=key).first()
        parent = by_key.get(new_parent)
        if row is not None and parent is not None and row.parent_id != parent.pk:
            row.parent = parent
            row.save()

    # Remove any leftover rows that are no longer part of the tree, but only
    # when they are not referenced by any opportunity M2M (real data is kept).
    valid = set(by_key)
    stale = OpportunityField.objects.exclude(key__in=valid)
    for row in stale:
        if not row.opportunities.exists():
            row.delete()


def unseed(apps, schema_editor):
    # Nothing to reverse — this is a corrective reshuffle.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0010_alter_opportunityfield_options"),
    ]

    operations = [
        migrations.RunPython(seed_subject_tree, unseed),
    ]
