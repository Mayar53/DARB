"""Opportunity domain entities and value objects (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.shared.domain.entity import Entity

CATEGORY_KEYS = (
    "volunteer",
    "competition",
    "fellowship",
    "scholarship",
    "program",
    "internship",
    "course",
    "workshop",
    "session",
    "conference",
    "grant",
    "research",
    "exchange",
)

# --------------------------------------------------------------------------- #
# Subject/field tree — a small number of broad parents, with detailed
# subcategories underneath. The keys must match the seeded OpportunityField
# rows. Each entry is (parent, (children...)); a parent with children is a
# two-level node (e.g. science -> chemistry). Three-level groups (STEM) list
# their sub-parents as children: stem -> science -> chemistry.
# --------------------------------------------------------------------------- #
SUBJECT_TREE: tuple[tuple[str, tuple[str, ...]], ...] = (
    # STEM → Science / Engineering / Technology (each with sub-subcategories)
    ("stem", ("science", "engineering", "technology")),
    ("science", ("biology", "chemistry", "physics", "mathematics", "environmental-science")),
    ("engineering", ("mechanical", "electrical", "civil", "chemical", "biomedical")),
    ("technology", ("computer-science", "ai-ml", "coding", "software-development", "cybersecurity", "data-science", "robotics")),
    # Business & Economics
    ("business-economics", ("entrepreneurship", "marketing", "finance", "accounting", "management", "economics", "hr")),
    # Arts & Design
    ("arts-design", ("graphic-design", "ui-ux", "illustration", "photography", "film-media", "fine-arts", "architecture")),
    # Social Sciences & Humanities
    ("social-humanities", ("psychology", "sociology", "political-science", "international-relations", "law", "history", "philosophy", "languages")),
    # Social Impact & Community
    ("social-impact-community", ("volunteering", "human-rights", "sustainability", "environment", "advocacy", "community-development")),
    # Education & Personal Development
    ("education-development", ("leadership", "public-speaking", "career-development", "personal-development", "languages-learning")),
    # General — broad everyday subcategories.
    ("general", ("general-interest", "lifestyle", "community", "everyday", "career-work", "family")),
)

#: All subject keys (parents + children), for validation.
FIELD_KEYS: tuple[str, ...] = tuple(
    dict.fromkeys(parent for parent, _ in SUBJECT_TREE)
) + tuple(
    child for _, children in SUBJECT_TREE for child in children
)

#: child key → immediate parent key.
SUBJECT_CHILD_PARENT: dict[str, str] = {
    child: parent for parent, children in SUBJECT_TREE for child in children
}

#: direct parent → children (for the filter's second step).
SUBJECT_PARENTS: dict[str, tuple[str, ...]] = dict(SUBJECT_TREE)

#: For 3-level groups: group key → its sub-parents. STEM is the only 3-level
#: group (stem → science/engineering/technology); its sub-parents have their
#: own children and are also listed as parents in SUBJECT_TREE.
_GROUP_KEYS: tuple[str, ...] = ("stem",)
SUBJECT_GROUPS: dict[str, tuple[str, ...]] = {
    key: tuple(children for parent, children in SUBJECT_TREE if parent == key)[0]
    for key in _GROUP_KEYS
}

#: Per-key display colour (parents + children).
SUBJECT_COLORS: dict[str, str] = {
    # Broad groups
    "stem": "#0F766E",
    "science": "#0F766E",
    "engineering": "#B45309",
    "technology": "#0369A1",
    "business-economics": "#4D7C0F",
    "arts-design": "#C026D3",
    "social-humanities": "#9F1239",
    "social-impact-community": "#C0533D",
    "education-development": "#A16207",
    # Science
    "biology": "#15803D",
    "chemistry": "#0F766E",
    "physics": "#4338CA",
    "mathematics": "#A16207",
    "environmental-science": "#4D7C0F",
    # Engineering
    "mechanical": "#B45309",
    "electrical": "#D97706",
    "civil": "#A16207",
    "chemical": "#0F766E",
    "biomedical": "#BE123C",
    # Technology
    "computer-science": "#0369A1",
    "ai-ml": "#7C3AED",
    "coding": "#0369A1",
    "software-development": "#4338CA",
    "cybersecurity": "#0F766E",
    "data-science": "#4338CA",
    "robotics": "#BE123C",
    # Business & Economics
    "entrepreneurship": "#B45309",
    "marketing": "#C026D3",
    "finance": "#047857",
    "accounting": "#4D7C0F",
    "management": "#0F766E",
    "economics": "#A16207",
    "hr": "#0369A1",
    # Arts & Design
    "graphic-design": "#C026D3",
    "ui-ux": "#7C3AED",
    "illustration": "#A21CAF",
    "photography": "#B45309",
    "film-media": "#EA580C",
    "fine-arts": "#C026D3",
    "architecture": "#A16207",
    # Social Sciences & Humanities
    "psychology": "#9F1239",
    "sociology": "#0F766E",
    "political-science": "#4338CA",
    "international-relations": "#0369A1",
    "law": "#B45309",
    "history": "#A16207",
    "philosophy": "#7C3AED",
    "languages": "#C026D3",
    # Social Impact & Community
    "volunteering": "#0E4749",
    "human-rights": "#BE123C",
    "sustainability": "#15803D",
    "environment": "#4D7C0F",
    "advocacy": "#EA580C",
    "community-development": "#047857",
    # Education & Personal Development
    "leadership": "#B45309",
    "public-speaking": "#7C3AED",
    "career-development": "#0369A1",
    "personal-development": "#C026D3",
    "languages-learning": "#A16207",
    # Fallback
    "general": "#6B7280",
    "general-interest": "#6B7280",
    "lifestyle": "#A16207",
    "community": "#0E4749",
    "everyday": "#5C5C5C",
    "career-work": "#0369A1",
    "family": "#C0533D",
}

MODE_KEYS = ("online", "in-person", "hybrid")
FUNDING_KEYS = ("paid", "free", "fully-funded", "partially-funded")
AGE_KEYS = ("all", "13-15", "15-18", "+18")


def is_valid_age(value: str) -> bool:
    """Whether ``value`` is an acceptable age group.

    Accepts the canonical keys ("all", "13-15", "15-18", "+18") plus free-text
    numeric ranges so admins can express custom bands such as "15-25", "+26",
    "26+", or "-12" (under 12). The regex intentionally allows any well-formed
    ``N-M`` / ``+N`` / ``N+`` / ``-N`` so the exact set of bands stays open —
    filtering overlaps are resolved on the frontend.
    """
    import re

    if value in AGE_KEYS:
        return True
    if not isinstance(value, str):
        return False
    v = value.strip()
    return re.fullmatch(r"(?:\d{1,3}\s*-\s*\d{1,3}|\+\d{1,3}|\d{1,3}\+|-\d{1,3})", v) is not None


@dataclass(kw_only=True)
class Opportunity(Entity):
    category: str
    title: str
    description: str
    # Optional per-language overrides; when blank/None the base title/description
    # is used for that locale. Never required.
    title_ar: str | None = None
    title_en: str | None = None
    description_ar: str | None = None
    description_en: str | None = None
    location: str = ""
    mode: str = "online"
    duration: str = ""
    funding: str = "free"
    price: str = ""
    deadline: date | None = None
    apply_url: str = ""
    # Visibility: "published" is public; draft/hidden/archived are management
    # states. "Expired" is derived from the deadline, not stored.
    status: str = "published"
    created_by: int | None = None
    organization: int | None = None
    organization_name: str = ""
    organization_website: str = ""
    age: str = "all"
    certificate: bool = False
    apply_clicks: int = 0
    views: int = 0
    # Field/domain tags (chemistry, art, sport…).
    fields: list[str] = field(default_factory=list)
    # Read-only denormalised: the admin who created this opportunity.
    created_by_name: str = ""

    @property
    def is_active(self) -> bool:
        """Compatibility alias: published == visible."""
        return self.status == "published"
