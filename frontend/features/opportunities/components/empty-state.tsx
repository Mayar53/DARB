"use client";

import { useTranslation } from "@/hooks/use-translation";

import {
  selectHasActiveFilters,
  useOpportunitiesStore,
} from "../store/opportunities.store";

/** Draft .empty-state — shown when no opportunities match the filters. */
export function EmptyState() {
  const { t } = useTranslation();
  const clearFilters = useOpportunitiesStore((s) => s.clearFilters);
  const hasFilters = useOpportunitiesStore(selectHasActiveFilters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground sm:px-6">
      <p className="mx-auto max-w-md">{t("home.empty")}</p>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="mt-4 rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {t("home.clearFilters")}
        </button>
      )}
    </div>
  );
}
