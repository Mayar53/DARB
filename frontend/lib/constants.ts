import type { MessageKey } from "@/lib/i18n";

export const APP_NAME = "DARB|درب";

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  account: "/account",
  admin: "/admin",
  adminDashboard: "/admin/dashboard",
  adminApply: "/admin/apply",
  adminRegister: "/admin/register",
  saved: "/saved",
  applied: "/applied",
} as const;

export type Direction = "rtl" | "ltr";
export const DEFAULT_DIRECTION: Direction = "rtl";
export const DEFAULT_LOCALE = "ar";

/** Canonical opportunity types — keys match the backend choices and draft.js. */
export const CATEGORY_KEYS = [
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
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Category metadata — multi-color palette matching draft.js. */
export const CATEGORIES: ReadonlyArray<{
  key: CategoryKey;
  color: string;
  labelKey: MessageKey;
}> = [
  { key: "volunteer", color: "#0E4749", labelKey: "cat.volunteer" },
  { key: "competition", color: "#C0533D", labelKey: "cat.competition" },
  { key: "fellowship", color: "#6E4B6E", labelKey: "cat.fellowship" },
  { key: "scholarship", color: "#2E6E5E", labelKey: "cat.scholarship" },
  { key: "program", color: "#4A6FA5", labelKey: "cat.program" },
  { key: "internship", color: "#3E5F8A", labelKey: "cat.internship" },
  { key: "course", color: "#D4A24E", labelKey: "cat.course" },
  { key: "workshop", color: "#B8762E", labelKey: "cat.workshop" },
  { key: "session", color: "#3E6B4F", labelKey: "cat.session" },
  { key: "conference", color: "#8A4A56", labelKey: "cat.conference" },
  { key: "grant", color: "#5B8A3E", labelKey: "cat.grant" },
  { key: "research", color: "#4338CA", labelKey: "cat.research" },
  { key: "exchange", color: "#B45309", labelKey: "cat.exchange" },
] as const;

export function categoryInfo(key: string): {
  key: CategoryKey;
  color: string;
  labelKey: MessageKey;
} {
  return (
    CATEGORIES.find((c) => c.key === key) ?? {
      key: "workshop",
      color: "#0E4749",
      labelKey: "cat.workshop",
    }
  );
}

/**
 * Subject/field tree — a small number of broad parent categories, with detailed
 * subcategories underneath. A group whose children have their own `children`
 * (e.g. stem → science → chemistry) is a 3-level group. The keys must match
 * the seeded backend OpportunityField rows.
 */
export const SUBJECT_TREE: ReadonlyArray<{
  key: string;
  color: string;
  labelKey: MessageKey;
  children: ReadonlyArray<{
    key: string;
    color: string;
    labelKey: MessageKey;
    children?: ReadonlyArray<{ key: string; color: string; labelKey: MessageKey }>;
  }>;
}> = [
  {
    key: "stem",
    color: "#0F766E",
    labelKey: "field.stem",
    children: [
      {
        key: "science",
        color: "#0F766E",
        labelKey: "field.science",
        children: [
          { key: "biology", color: "#15803D", labelKey: "field.biology" },
          { key: "chemistry", color: "#0F766E", labelKey: "field.chemistry" },
          { key: "physics", color: "#4338CA", labelKey: "field.physics" },
          { key: "mathematics", color: "#A16207", labelKey: "field.mathematics" },
          { key: "environmental-science", color: "#4D7C0F", labelKey: "field.environmentalScience" },
        ],
      },
      {
        key: "engineering",
        color: "#B45309",
        labelKey: "field.engineering",
        children: [
          { key: "mechanical", color: "#B45309", labelKey: "field.mechanical" },
          { key: "electrical", color: "#D97706", labelKey: "field.electrical" },
          { key: "civil", color: "#A16207", labelKey: "field.civil" },
          { key: "chemical", color: "#0F766E", labelKey: "field.chemical" },
          { key: "biomedical", color: "#BE123C", labelKey: "field.biomedical" },
        ],
      },
      {
        key: "technology",
        color: "#0369A1",
        labelKey: "field.technology",
        children: [
          { key: "computer-science", color: "#0369A1", labelKey: "field.computerScience" },
          { key: "ai-ml", color: "#7C3AED", labelKey: "field.aiMl" },
          { key: "coding", color: "#0369A1", labelKey: "field.coding" },
          { key: "software-development", color: "#4338CA", labelKey: "field.softwareDevelopment" },
          { key: "cybersecurity", color: "#0F766E", labelKey: "field.cybersecurity" },
          { key: "data-science", color: "#4338CA", labelKey: "field.dataScience" },
          { key: "robotics", color: "#BE123C", labelKey: "field.robotics" },
        ],
      },
    ],
  },
  {
    key: "business-economics",
    color: "#4D7C0F",
    labelKey: "field.businessEconomics",
    children: [
      { key: "entrepreneurship", color: "#B45309", labelKey: "field.entrepreneurship" },
      { key: "marketing", color: "#C026D3", labelKey: "field.marketing" },
      { key: "finance", color: "#047857", labelKey: "field.finance" },
      { key: "accounting", color: "#4D7C0F", labelKey: "field.accounting" },
      { key: "management", color: "#0F766E", labelKey: "field.management" },
      { key: "economics", color: "#A16207", labelKey: "field.economics" },
      { key: "hr", color: "#0369A1", labelKey: "field.hr" },
    ],
  },
  {
    key: "arts-design",
    color: "#C026D3",
    labelKey: "field.artsDesign",
    children: [
      { key: "graphic-design", color: "#C026D3", labelKey: "field.graphicDesign" },
      { key: "ui-ux", color: "#7C3AED", labelKey: "field.uiUx" },
      { key: "illustration", color: "#A21CAF", labelKey: "field.illustration" },
      { key: "photography", color: "#B45309", labelKey: "field.photography" },
      { key: "film-media", color: "#EA580C", labelKey: "field.filmMedia" },
      { key: "fine-arts", color: "#C026D3", labelKey: "field.fineArts" },
      { key: "architecture", color: "#A16207", labelKey: "field.architecture" },
    ],
  },
  {
    key: "social-humanities",
    color: "#9F1239",
    labelKey: "field.socialHumanities",
    children: [
      { key: "psychology", color: "#9F1239", labelKey: "field.psychology" },
      { key: "sociology", color: "#0F766E", labelKey: "field.sociology" },
      { key: "political-science", color: "#4338CA", labelKey: "field.politicalScience" },
      { key: "international-relations", color: "#0369A1", labelKey: "field.internationalRelations" },
      { key: "law", color: "#B45309", labelKey: "field.law" },
      { key: "history", color: "#A16207", labelKey: "field.history" },
      { key: "philosophy", color: "#7C3AED", labelKey: "field.philosophy" },
      { key: "languages", color: "#C026D3", labelKey: "field.languages" },
    ],
  },
  {
    key: "social-impact-community",
    color: "#C0533D",
    labelKey: "field.socialImpactCommunity",
    children: [
      { key: "volunteering", color: "#0E4749", labelKey: "field.volunteering" },
      { key: "human-rights", color: "#BE123C", labelKey: "field.humanRights" },
      { key: "sustainability", color: "#15803D", labelKey: "field.sustainability" },
      { key: "environment", color: "#4D7C0F", labelKey: "field.environment" },
      { key: "advocacy", color: "#EA580C", labelKey: "field.advocacy" },
      { key: "community-development", color: "#047857", labelKey: "field.communityDevelopment" },
    ],
  },
  {
    key: "education-development",
    color: "#A16207",
    labelKey: "field.educationDevelopment",
    children: [
      { key: "leadership", color: "#B45309", labelKey: "field.leadership" },
      { key: "public-speaking", color: "#7C3AED", labelKey: "field.publicSpeaking" },
      { key: "career-development", color: "#0369A1", labelKey: "field.careerDevelopment" },
      { key: "personal-development", color: "#C026D3", labelKey: "field.personalDevelopment" },
      { key: "languages-learning", color: "#A16207", labelKey: "field.languagesLearning" },
    ],
  },
  {
    key: "general",
    color: "#6B7280",
    labelKey: "field.general",
    children: [
      { key: "general-interest", color: "#6B7280", labelKey: "field.generalInterest" },
      { key: "lifestyle", color: "#A16207", labelKey: "field.lifestyle" },
      { key: "community", color: "#0E4749", labelKey: "field.community" },
      { key: "everyday", color: "#5C5C5C", labelKey: "field.everyday" },
      { key: "career-work", color: "#0369A1", labelKey: "field.careerWork" },
      { key: "family", color: "#C0533D", labelKey: "field.family" },
    ],
  },
];

/** All subject nodes flattened (parents + children) — the flat FIELDS equivalent. */
export const SUBJECTS: ReadonlyArray<{ key: string; color: string; labelKey: MessageKey }> = [
  ...SUBJECT_TREE.map((s) => ({ key: s.key, color: s.color, labelKey: s.labelKey })),
  ...SUBJECT_TREE.flatMap((s) => s.children),
  ...SUBJECT_TREE.flatMap((s) =>
    s.children.flatMap((c) => c.children ?? []).map((c) => ({ key: c.key, color: c.color, labelKey: c.labelKey })),
  ),
];

export const FIELD_KEYS = SUBJECTS.map((s) => s.key) as readonly string[];
export type FieldKey = (typeof FIELD_KEYS)[number];

/** Backward-compat alias for the flat subject list (used by the admin form). */
export const FIELDS = SUBJECTS;

export function fieldInfo(key: string): { key: string; color: string; labelKey: MessageKey } {
  const found = SUBJECTS.find((f) => f.key === key);
  return found ?? { key: "general", color: "#6B7280", labelKey: "field.general" };
}

/** direct parent → children (for the filter's second step). */
export const SUBJECT_PARENTS: Record<string, readonly string[]> = Object.fromEntries(
  SUBJECT_TREE.map((s) => [s.key, s.children.map((c) => c.key)]),
);

/** Child key → direct parent key. */
export const SUBJECT_CHILD_PARENT: Record<string, string> = Object.fromEntries(
  SUBJECT_TREE.flatMap((s) => s.children.map((c) => [c.key, s.key])),
);

/** For 3-level groups: group key → its sub-parent keys (e.g. stem → science/engineering/technology). */
export const SUBJECT_GROUP_PARENTS: Record<string, readonly string[]> = Object.fromEntries(
  SUBJECT_TREE.filter((s) => s.children.some((c) => c.children && c.children.length > 0)).map((s) => [
    s.key,
    s.children.filter((c) => c.children && c.children.length > 0).map((c) => c.key),
  ]),
);

/** For 3-level groups: (group, sub-parent) → sub-subcategory keys (e.g. stem+science → biology/…). */
export const SUBJECT_GROUP_CHILDREN: Record<string, Record<string, readonly string[]>> = Object.fromEntries(
  SUBJECT_TREE.filter((s) => s.children.some((c) => c.children && c.children.length > 0)).map((s) => [
    s.key,
    Object.fromEntries(
      s.children
        .filter((c) => c.children && c.children.length > 0)
        .map((c) => [c.key, c.children!.map((g) => g.key)]),
    ),
  ]),
);

/** Whether a key is a 3-level group (stem) or a sub-parent inside one (science/engineering/technology). */
export function isGroupedKey(key: string): boolean {
  return key === "stem" || key === "science" || key === "engineering" || key === "technology";
}

export const MODES = ["online", "in-person", "hybrid"] as const;
export type Mode = (typeof MODES)[number];

export const FUNDING = ["paid", "free", "fully-funded", "partially-funded"] as const;
export type Funding = (typeof FUNDING)[number];

/** Label key for a funding value — used by the filter, cards and detail. */
export function fundingLabelKey(funding: string): MessageKey {
  switch (funding) {
    case "paid":
      return "home.fundingPaid";
    case "fully-funded":
      return "home.fundingFullyFunded";
    case "partially-funded":
      return "home.fundingPartiallyFunded";
    case "free":
    default:
      return "home.fundingFree";
  }
}

/** Funding values that display a price when one is provided. */
export function fundingShowsPrice(funding: string): boolean {
  return funding === "paid" || funding === "partially-funded";
}

export const SORTS = ["newest", "deadline"] as const;
export type SortKey = (typeof SORTS)[number];

/** Legacy age groups — matches the backend `Age` choices and draft.js. */
export const AGES = ["all", "13-15", "15-18", "+18"] as const;
export type AgeKey = (typeof AGES)[number];

/**
 * Age filter buckets offered in the filter bar. Each maps to an inclusive
 * numeric range; an opportunity matches when its stored age range (canonical
 * "13-15"/"+18", or a free-text range such as "15-25") OVERLAPS the bucket.
 *
 * Buckets intentionally overlap at boundaries (13-15 and 16-18, 18-21…) so a
 * user whose age is on an edge still finds opportunities covering them.
 */
export interface AgeFilterOption {
  key: string;
  /** Inclusive lower bound of the bucket. */
  min: number;
  /** Inclusive upper bound of the bucket. */
  max: number;
}

export const AGE_FILTERS: readonly AgeFilterOption[] = [
  { key: "under-13", min: 0, max: 12 },
  { key: "13-15", min: 13, max: 15 },
  { key: "16-18", min: 16, max: 18 },
  { key: "19-21", min: 19, max: 21 },
  { key: "22-25", min: 22, max: 25 },
  { key: "26+", min: 26, max: 150 },
] as const;

/** Display labels for the age filter buckets (i18n message keys). */
export const AGE_FILTER_LABELS: Record<string, MessageKey> = {
  "under-13": "home.ageUnder13",
  "13-15": "home.age13to15",
  "16-18": "home.age16to18",
  "19-21": "home.age19to21",
  "22-25": "home.age22to25",
  "26+": "home.age26plus",
};

/** Duration buckets for the duration filter. */
export const DURATIONS = ["short", "medium", "long"] as const;
export type DurationKey = (typeof DURATIONS)[number];
