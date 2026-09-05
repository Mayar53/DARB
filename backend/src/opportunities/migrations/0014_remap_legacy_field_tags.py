"""Remap legacy subject tags (ai/business/social-sciences) to their canonical
equivalents so editing an opportunity that still references them validates
against the domain FIELD_KEYS (ai-ml / business-economics / social-humanities).

The legacy rows are kept for backward-compat M2M reads but are intentionally
not part of the canonical field tree, so opportunities are migrated off them.
"""

from django.db import migrations

# legacy key -> canonical key (must exist as an OpportunityField row).
LEGACY_TO_CANONICAL = {
    "ai": "ai-ml",
    "business": "business-economics",
    "social-sciences": "social-humanities",
}


def remap_legacy_tags(apps, schema_editor):
    OpportunityField = apps.get_model("opportunities", "OpportunityField")
    Opportunity = apps.get_model("opportunities", "OpportunityModel")

    field_by_key = {row.key: row for row in OpportunityField.objects.all()}

    for opp in Opportunity.objects.prefetch_related("fields").all():
        current_keys = set(opp.fields.values_list("key", flat=True))
        for legacy, canonical in LEGACY_TO_CANONICAL.items():
            if legacy not in current_keys:
                continue
            legacy_row = field_by_key.get(legacy)
            canonical_row = field_by_key.get(canonical)
            if legacy_row is None or canonical_row is None:
                continue
            # Swap the legacy tag for its canonical sibling (deduped).
            opp.fields.remove(legacy_row)
            if canonical not in current_keys:
                opp.fields.add(canonical_row)
            current_keys.discard(legacy)
            current_keys.add(canonical)


def unseed(apps, schema_editor):
    # Not reversible — legacy rows were already detached from the canonical set.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0013_opportunitymodel_price"),
    ]

    operations = [
        migrations.RunPython(remap_legacy_tags, unseed),
    ]
