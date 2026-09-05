"use client";

import { create } from "zustand";

import {
  AGE_FILTERS,
  SUBJECT_GROUP_CHILDREN,
  SUBJECT_GROUP_PARENTS,
  SUBJECT_PARENTS,
  categoryInfo,
  fieldInfo,
} from "@/lib/constants";
import type { DurationKey, Funding, Mode, SortKey } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";

import { opportunitiesApi } from "../api/opportunities.api";
import type { OpportunityCardView } from "../types";

interface OpportunitiesState {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;

  /** Filters (mirror draft.js behaviour). */
  search: string;
  activeCategories: string[];
  /** Subject keys (parents + subcategories) — the hierarchical field filter. */
  activeSubjects: string[];
  mode: Mode | "all";
  funding: Funding | "all";
  age: string;
  certificate: "all" | "yes" | "no";
  location: string;
  /** Duration buckets for the duration filter. */
  duration: DurationKey | "all";
  /** Deadline state: all (default) | open (has future/any deadline) | closing (within 7 days). */
  deadline: "all" | "open" | "closing";
  sort: SortKey;
  /** The opportunity picked by "Surprise me" (id, or null). */
  surprisePickId: number | null;

  fetch: () => Promise<void>;
  setSearch: (value: string) => void;
  toggleCategory: (key: string) => void;
  clearCategories: () => void;
  toggleSubject: (key: string) => void;
  clearSubjects: () => void;
  setMode: (mode: Mode | "all") => void;
  setFunding: (funding: Funding | "all") => void;
  setAge: (age: string) => void;
  setCertificate: (certificate: "all" | "yes" | "no") => void;
  setLocation: (location: string) => void;
  setDuration: (duration: DurationKey | "all") => void;
  setDeadline: (deadline: "all" | "open" | "closing") => void;
  setSort: (sort: SortKey) => void;
  clearFilters: () => void;
  /** Pick a random open opportunity (respects active filters) and highlight it. */
  surprise: () => void;
  clearSurprise: () => void;
}

/** Days before a deadline when we flag an opportunity as "closing soon". */
const CLOSING_SOON_DAYS = 7;

/** True when the opportunity has no future deadline (or passed it today). */
function isClosed(opportunity: Opportunity, now: Date): boolean {
  if (!opportunity.deadline) return false;
  const deadline = new Date(`${opportunity.deadline}T23:59:59`);
  return deadline.getTime() < now.getTime();
}

/** True when the deadline is within the next N days (and not already closed). */
function isClosingSoon(opportunity: Opportunity, now: Date): boolean {
  if (!opportunity.deadline) return false;
  const deadline = new Date(`${opportunity.deadline}T23:59:59`);
  if (deadline.getTime() < now.getTime()) return false;
  const soonMs = CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000;
  return deadline.getTime() - now.getTime() <= soonMs;
}

/** Heuristic duration buckets for the duration filter (free text in the DB). */
export function durationBucket(duration: string): DurationKey {
  const d = duration.toLowerCase();
  if (/(day|hour|session|half day)/.test(d) && !/month|week/.test(d)) return "short";
  if (/week|weeks/.test(d)) return "medium";
  if (/month|months|year|semester/.test(d)) return "long";
  // Fall back to short when we can't tell (e.g. empty).
  return "short";
}

/**
 * Normalize a location value for comparison/deduping: trim + case-fold so
 * "Online", "online" and "ONLINE" are the same filter, and whitespace-only
 * variants collapse to the same key.
 */
export function normalizeLocation(location: string): string {
  return location.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Distinct locations from the loaded opportunities, sorted alphabetically.
 * Case-insensitive dedupe: "Online" and "online" collapse into one option
 * (the first-seen spelling is kept for display). */
export function selectLocations(state: OpportunitiesState): string[] {
  const seen = new Map<string, string>();
  state.opportunities.forEach((o) => {
    const value = (o.location ?? "").trim();
    if (!value) return;
    const key = normalizeLocation(value);
    if (!seen.has(key)) seen.set(key, value);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** An inclusive age range [min, max]. */
export interface AgeRange {
  min: number;
  max: number;
}

/**
 * Parse a stored opportunity age value into an inclusive numeric range.
 * Understands:
 *  - "all"                    → { min: 0,  max: 150 } (no restriction)
 *  - "13-15" / "15 - 25"      → { min: 13, max: 15 } etc.
 *  - "+18" / "18+"            → { min: 18, max: 150 }
 *  - "-12" (under 12)         → { min: 0,  max: 12 }
 * Anything unrecognized returns null (caller decides how to treat it).
 */
export function parseAgeRange(age: string | null | undefined): AgeRange | null {
  const value = (age ?? "").trim().replace(/\s+/g, " ");
  if (!value || value.toLowerCase() === "all") return { min: 0, max: 150 };

  let m = /^(\d{1,3})\s*-\s*(\d{1,3})$/.exec(value); // "13-15"
  if (m) {
    const min = Number(m[1]);
    const max = Number(m[2]);
    return min <= max ? { min, max } : { min: max, max: min };
  }
  m = /^\+(\d{1,3})$/.exec(value); // "+18"
  if (m) return { min: Number(m[1]), max: 150 };
  m = /^(\d{1,3})\+$/.exec(value); // "18+"
  if (m) return { min: Number(m[1]), max: 150 };
  m = /^-(\d{1,3})$/.exec(value); // "-12"
  if (m) return { min: 0, max: Number(m[1]) };
  return null;
}

/** True when two inclusive ranges share at least one integer age. */
export function rangesOverlap(a: AgeRange, b: AgeRange): boolean {
  return a.min <= b.max && b.min <= a.max;
}

/** True when the opportunity's stored age overlaps the selected filter bucket. */
export function opportunityMatchesAge(opportunity: Opportunity, selectedKey: string): boolean {
  if (selectedKey === "all") return true;
  const selected = AGE_FILTERS.find((f) => f.key === selectedKey);
  if (!selected) return true; // Unknown bucket → don't filter out.
  const oppRange = parseAgeRange(opportunity.age);
  // Unparseable/blank stored age → treat as unrestricted ("all").
  if (!oppRange) return true;
  return rangesOverlap(oppRange, { min: selected.min, max: selected.max });
}

export const useOpportunitiesStore = create<OpportunitiesState>((set) => ({
  opportunities: [],
  loading: false,
  error: null,
  search: "",
  activeCategories: [],
  activeSubjects: [],
  mode: "all",
  funding: "all",
  age: "all",
  certificate: "all",
  location: "all",
  duration: "all",
  deadline: "all",
  sort: "newest",
  surprisePickId: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const opportunities = await opportunitiesApi.list();
      set({ opportunities, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load opportunities",
        loading: false,
      });
    }
  },

  setSearch: (search) => set({ search }),
  toggleCategory: (key) =>
    set((state) => {
      const active = state.activeCategories.includes(key)
        ? state.activeCategories.filter((c) => c !== key)
        : [...state.activeCategories, key];
      return { activeCategories: active };
    }),
  clearCategories: () => set({ activeCategories: [] }),
  toggleSubject: (key) =>
    set((state) => {
      const active = state.activeSubjects.includes(key)
        ? state.activeSubjects.filter((f) => f !== key)
        : [...state.activeSubjects, key];
      return { activeSubjects: active };
    }),
  clearSubjects: () => set({ activeSubjects: [] }),
  setMode: (mode) => set({ mode }),
  setFunding: (funding) => set({ funding }),
  setAge: (age) => set({ age }),
  setCertificate: (certificate) => set({ certificate }),
  setLocation: (location) => {
    // Treat any case/spacing variant of "online" as the special online filter
    // (matches online/hybrid modes + online-typed locations), never as a literal
    // location string that would fail to match identical rows.
    const normalized = normalizeLocation(location);
    set({ location: normalized === "online" ? "online" : location });
  },
  setDuration: (duration) => set({ duration }),
  setDeadline: (deadline) => set({ deadline }),
  setSort: (sort) => set({ sort }),
  clearFilters: () =>
    set({
      search: "",
      activeCategories: [],
      activeSubjects: [],
      mode: "all",
      funding: "all",
      age: "all",
      certificate: "all",
      location: "all",
      duration: "all",
      deadline: "all",
      sort: "newest",
      surprisePickId: null,
    }),
  surprise: () => {
    const state = useOpportunitiesStore.getState();
    const open = state.opportunities.filter((o) => {
      const deadline = o.deadline ? new Date(`${o.deadline}T23:59:59`) : null;
      return deadline === null || deadline.getTime() >= Date.now();
    });
    if (open.length === 0) return;
    const pick = open[Math.floor(Math.random() * open.length)];
    set({ surprisePickId: pick.id });
  },
  clearSurprise: () => set({ surprisePickId: null }),
}));

/** True when an opportunity's subject tags match any selected subject key.
 * - A selected broad group (e.g. "stem") matches any of its children
 *   (science/engineering/technology) AND their children (biology, …).
 * - A selected sub-parent (e.g. "science") matches its own children.
 * - A selected leaf matches exactly. */
function matchesSubjects(opportunity: Opportunity, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const tags = opportunity.fields ?? [];

  const matches = (sel: string): boolean => {
    if (tags.includes(sel)) return true;

    // 3-level group: stem → [science, engineering, technology] → leaves.
    const groupParents = SUBJECT_GROUP_PARENTS[sel];
    if (groupParents && groupParents.some((p) => tags.includes(p))) return true;
    const groupChildren = SUBJECT_GROUP_CHILDREN[sel];
    if (groupChildren) {
      const leaves = Object.values(groupChildren).flat();
      if (leaves.some((l) => tags.includes(l))) return true;
    }

    // Direct parent → children.
    const children = SUBJECT_PARENTS[sel];
    return children !== undefined && children.some((c) => tags.includes(c));
  };

  return selected.some(matches);
}

/** Derived selector — applies search + pills + mode/funding/age/cert/location/duration + sort. */
export function selectFiltered(state: OpportunitiesState): OpportunityCardView[] {
  const now = new Date();
  const query = state.search.trim().toLowerCase();

  const filtered = state.opportunities.filter((o) => {
    if (query) {
      // Rich haystack — mirror draft.js getFiltered: title, description, location,
      // category label and field labels all count as searchable text. Includes the
      // per-language overrides so a search in either language finds the row.
      const haystack = [
        o.title,
        o.title_ar,
        o.title_en,
        o.description,
        o.description_ar,
        o.description_en,
        o.location,
        categoryInfo(o.category).labelKey,
        ...(o.fields ?? []).map((f) => fieldInfo(f).labelKey),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (state.activeCategories.length > 0 && !state.activeCategories.includes(o.category))
      return false;
    if (!matchesSubjects(o, state.activeSubjects)) return false;
    if (state.mode !== "all" && o.mode !== state.mode) return false;
    if (state.funding !== "all" && o.funding !== state.funding) return false;
    if (state.age !== "all" && !opportunityMatchesAge(o, state.age)) return false;
    if (state.certificate === "yes" && !o.certificate) return false;
    if (state.certificate === "no" && o.certificate) return false;
    if (state.location !== "all") {
      // The special "Online" location filter matches opportunities whose mode is
      // online or hybrid, plus any whose location is an "online" variant
      // ("Online", "online", "Online / Remote").
      if (state.location === "online") {
        const loc = normalizeLocation(o.location ?? "");
        if (o.mode === "in-person" && loc !== "online" && !loc.startsWith("online ")) return false;
      } else {
        // Real location selection — case-insensitive exact match.
        if (normalizeLocation(o.location ?? "") !== normalizeLocation(state.location)) return false;
      }
    }
    if (state.duration !== "all" && durationBucket(o.duration) !== state.duration) return false;
    // Deadline availability — "open" = not yet closed; "closing" = within 7 days.
    if (state.deadline === "open" && isClosed(o, now)) return false;
    if (state.deadline === "closing" && !isClosingSoon(o, now)) return false;
    return true;
  });

  const sorted = [...filtered];
  if (state.sort === "newest") {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    sorted.sort((a, b) => {
      const ad = a.deadline ? new Date(`${a.deadline}T23:59:59`).getTime() : Infinity;
      const bd = b.deadline ? new Date(`${b.deadline}T23:59:59`).getTime() : Infinity;
      return ad - bd;
    });
  }

  return sorted.map((o) => ({
    ...o,
    closed: isClosed(o, now),
    closingSoon: isClosingSoon(o, now),
  }));
}

/** Open opportunities (not closed) — shared by Surprise Me and the recs rows. */
export function selectOpen(state: OpportunitiesState): OpportunityCardView[] {
  const now = new Date();
  return state.opportunities
    .filter((o) => !isClosed(o, now))
    .map((o) => ({
      ...o,
      closed: false,
      closingSoon: isClosingSoon(o, now),
    }));
}

/** "Made for you" — draft.js renderRecs scoring: rank open, non-liked
 * opportunities by how many of your saved+applied+viewed opportunities share
 * their category. */
export function selectMadeForYou(
  state: OpportunitiesState,
  likedIds: Set<number>,
  viewedIds: Set<number>,
): OpportunityCardView[] {
  const open = selectOpen(state);
  const catCount: Record<string, number> = {};
  state.opportunities.forEach((o) => {
    if (likedIds.has(o.id)) {
      catCount[o.category] = (catCount[o.category] ?? 0) + 1;
    }
  });
  return open
    .filter((o) => !likedIds.has(o.id))
    .map((o) => ({ o, score: (catCount[o.category] ?? 0) + (viewedIds.has(o.id) ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.o);
}

/** "Closing this week" — open opportunities whose deadline is within 7 days. */
export function selectClosingThisWeek(state: OpportunitiesState): OpportunityCardView[] {
  return selectOpen(state).filter((o) => o.closingSoon).slice(0, 8);
}

export const selectHasActiveFilters = (state: OpportunitiesState): boolean =>
  state.search.trim() !== "" ||
  state.activeCategories.length > 0 ||
  state.activeSubjects.length > 0 ||
  state.mode !== "all" ||
  state.funding !== "all" ||
  state.age !== "all" ||
  state.certificate !== "all" ||
  state.location !== "all" ||
  state.duration !== "all" ||
  state.deadline !== "all";
