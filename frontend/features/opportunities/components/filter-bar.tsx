"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

import { Slider } from "@/components/ui/slider";
import { AGE_RANGE_MAX, AGE_RANGE_MIN, DURATIONS, FUNDING, MODES, SORTS } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import type { MessageKey } from "@/lib/i18n";

import {
  FULL_AGE_RANGE,
  ageRangeLabel,
  isFullAgeRange,
  selectFiltered,
  selectHasActiveFilters,
  selectLocations,
  useOpportunitiesStore,
} from "../store/opportunities.store";

const MODE_LABELS: Record<(typeof MODES)[number], MessageKey> = {
  online: "home.modeOnline",
  "in-person": "home.modeInPerson",
  hybrid: "home.modeHybrid",
};

const FUNDING_LABELS: Record<(typeof FUNDING)[number], MessageKey> = {
  paid: "home.fundingPaid",
  free: "home.fundingFree",
  "fully-funded": "home.fundingFullyFunded",
  "partially-funded": "home.fundingPartiallyFunded",
};

const SORT_LABELS: Record<(typeof SORTS)[number], MessageKey> = {
  newest: "home.sortNewest",
  deadline: "home.sortDeadline",
};

const DURATION_LABELS: Record<(typeof DURATIONS)[number], MessageKey> = {
  short: "home.durationShort",
  medium: "home.durationMedium",
  long: "home.durationLong",
};

/** A single labelled select with the draft's pill visual style. */
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-muted-foreground">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-32 cursor-pointer rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-[0_2px_8px_rgba(14,71,73,0.05)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-primary focus:border-primary focus:ring-3 focus:ring-primary/10"
      >
        {children}
      </select>
    </label>
  );
}

/** The active filter count for the header chip. */
function useActiveFilterCount(): number {
  const activeCategories = useOpportunitiesStore((s) => s.activeCategories.length);
  const activeSubjects = useOpportunitiesStore((s) => s.activeSubjects.length);
  const mode = useOpportunitiesStore((s) => s.mode);
  const funding = useOpportunitiesStore((s) => s.funding);
  const ageRange = useOpportunitiesStore((s) => s.ageRange);
  const certificate = useOpportunitiesStore((s) => s.certificate);
  const location = useOpportunitiesStore((s) => s.location);
  const duration = useOpportunitiesStore((s) => s.duration);
  const deadline = useOpportunitiesStore((s) => s.deadline);
  const search = useOpportunitiesStore((s) => s.search);
  return (
    activeCategories +
    activeSubjects +
    (mode !== "all" ? 1 : 0) +
    (funding !== "all" ? 1 : 0) +
    (isFullAgeRange(ageRange) ? 0 : 1) +
    (certificate !== "all" ? 1 : 0) +
    (location !== "all" ? 1 : 0) +
    (duration !== "all" ? 1 : 0) +
    (deadline !== "all" ? 1 : 0) +
    (search.trim() !== "" ? 1 : 0)
  );
}

/** Mode / funding / certificate / location / duration / deadline / sort selects
 * plus the age range slider — wrapped in a modern, youth-friendly filter card. */
export function FilterBar() {
  const { t } = useTranslation();
  const mode = useOpportunitiesStore((s) => s.mode);
  const funding = useOpportunitiesStore((s) => s.funding);
  const sort = useOpportunitiesStore((s) => s.sort);
  const ageRange = useOpportunitiesStore((s) => s.ageRange);
  const certificate = useOpportunitiesStore((s) => s.certificate);
  const location = useOpportunitiesStore((s) => s.location);
  const duration = useOpportunitiesStore((s) => s.duration);
  const deadline = useOpportunitiesStore((s) => s.deadline);
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const search = useOpportunitiesStore((s) => s.search);
  const activeCategories = useOpportunitiesStore((s) => s.activeCategories);
  const activeSubjects = useOpportunitiesStore((s) => s.activeSubjects);
  // Derive once — `selectLocations` returns a fresh array, so it must not be
  // used directly as a useSyncExternalStore snapshot (causes an infinite loop).
  const locations = useMemo(() => selectLocations({ opportunities } as never), [opportunities]);
  const setMode = useOpportunitiesStore((s) => s.setMode);
  const setFunding = useOpportunitiesStore((s) => s.setFunding);
  const setSort = useOpportunitiesStore((s) => s.setSort);
  const setAgeRange = useOpportunitiesStore((s) => s.setAgeRange);
  const setCertificate = useOpportunitiesStore((s) => s.setCertificate);
  const setLocation = useOpportunitiesStore((s) => s.setLocation);
  const setDuration = useOpportunitiesStore((s) => s.setDuration);
  const setDeadline = useOpportunitiesStore((s) => s.setDeadline);
  const clearFilters = useOpportunitiesStore((s) => s.clearFilters);
  const hasFilters = useOpportunitiesStore(selectHasActiveFilters);
  const resultCount = useMemo(
    () =>
      selectFiltered({
        opportunities,
        search,
        activeCategories,
        activeSubjects,
        mode,
        funding,
        ageRange,
        certificate,
        location,
        duration,
        deadline,
        sort,
      } as never).length,
    [
      opportunities,
      search,
      activeCategories,
      activeSubjects,
      mode,
      funding,
      ageRange,
      certificate,
      location,
      duration,
      deadline,
      sort,
    ],
  );
  const activeCount = useActiveFilterCount();

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_8px_30px_rgba(14,71,73,0.07)]">
      {/* Card header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          {t("home.filtersTitle")}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {t("home.clearFilters")}
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          </button>
        )}
      </div>

      {/* Selects in a responsive grid (the age range spans the row below) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <FilterSelect label={t("home.filterMode")} value={mode} onChange={(v) => setMode(v as typeof mode)}>
          <option value="all">{t("home.modeAll")}</option>
          {MODES.map((m) => (
            <option key={m} value={m}>
              {t(MODE_LABELS[m])}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t("home.filterFunding")} value={funding} onChange={(v) => setFunding(v as typeof funding)}>
          <option value="all">{t("home.fundingAll")}</option>
          {FUNDING.map((f) => (
            <option key={f} value={f}>
              {t(FUNDING_LABELS[f])}
            </option>
          ))}
        </FilterSelect>

        {/* Age is a continuous range, so it sits on one compact inline row —
            label, track, value — instead of a block of its own. */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-3 lg:col-span-4 xl:col-span-7">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("home.filterAge")}
          </span>

          {/* The axis is numeric, so it stays left-to-right in RTL too. */}
          <Slider
            dir="ltr"
            className="min-w-32 flex-1"
            min={AGE_RANGE_MIN}
            max={AGE_RANGE_MAX}
            step={1}
            value={[ageRange.min, ageRange.max]}
            onValueChange={([min, max]) => setAgeRange({ min, max })}
            thumbLabels={[t("home.ageMinLabel"), t("home.ageMaxLabel")]}
          />

          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
            {ageRangeLabel(ageRange, t("home.ageAll"))}
          </span>
          {!isFullAgeRange(ageRange) && (
            <button
              type="button"
              onClick={() => setAgeRange(FULL_AGE_RANGE)}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {t("home.ageAll")}
            </button>
          )}
        </div>

        <FilterSelect label={t("home.filterCertificate")} value={certificate} onChange={(v) => setCertificate(v as typeof certificate)}>
          <option value="all">{t("home.certAll")}</option>
          <option value="yes">{t("home.certYes")}</option>
          <option value="no">{t("home.certNo")}</option>
        </FilterSelect>

        <FilterSelect label={t("home.filterLocation")} value={location} onChange={(v) => setLocation(v)}>
          <option value="all">{t("home.locationAll")}</option>
          {/* "Online" is a mode, not an invented location — matches online/hybrid.
              Only offered when the real location list doesn't already contain an
              "online" variant (avoids duplicate "Online" options). */}
          {!locations.some((l) => l.trim().toLocaleLowerCase() === "online") && (
            <option value="online">{t("home.modeOnline")}</option>
          )}
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t("home.filterDuration")} value={duration} onChange={(v) => setDuration(v as typeof duration)}>
          <option value="all">{t("home.durationAll")}</option>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {t(DURATION_LABELS[d])}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t("home.filterDeadline")} value={deadline} onChange={(v) => setDeadline(v as typeof deadline)}>
          <option value="all">{t("home.deadlineAll")}</option>
          <option value="open">{t("home.deadlineOpen")}</option>
          <option value="closing">{t("home.deadlineClosing")}</option>
        </FilterSelect>

        <FilterSelect label={t("home.filterSort")} value={sort} onChange={(v) => setSort(v as typeof sort)}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(SORT_LABELS[s])}
            </option>
          ))}
        </FilterSelect>
      </div>

      {/* Footer: results count + clear */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-5 py-2.5">
        <span className="text-[13px] font-semibold text-muted-foreground">
          {resultCount} {resultCount === 1 ? t("home.resultOne") : t("home.resultMany")}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] font-bold text-primary shadow-[0_2px_8px_rgba(14,71,73,0.05)] transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            {t("home.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
