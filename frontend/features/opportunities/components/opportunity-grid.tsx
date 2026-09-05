"use client";

import { useMemo } from "react";

import { useTranslation } from "@/hooks/use-translation";

import { selectFiltered, useOpportunitiesStore } from "../store/opportunities.store";
import { OpportunityCard } from "./opportunity-card";
import { EmptyState } from "./empty-state";

/** 3-column card grid (draft .grid) — collapses to 1 column on mobile. */
export function OpportunityGrid() {
  const { locale } = useTranslation();
  // Subscribe to the exact slices this component renders — NOT the whole store,
  // so unrelated state changes (typing in search, surprise pick, etc.) don't
  // re-render the whole card grid.
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const loading = useOpportunitiesStore((s) => s.loading);
  const error = useOpportunitiesStore((s) => s.error);
  const fetch = useOpportunitiesStore((s) => s.fetch);
  const search = useOpportunitiesStore((s) => s.search);
  const activeCategories = useOpportunitiesStore((s) => s.activeCategories);
  const activeSubjects = useOpportunitiesStore((s) => s.activeSubjects);
  const mode = useOpportunitiesStore((s) => s.mode);
  const funding = useOpportunitiesStore((s) => s.funding);
  const age = useOpportunitiesStore((s) => s.age);
  const certificate = useOpportunitiesStore((s) => s.certificate);
  const location = useOpportunitiesStore((s) => s.location);
  const duration = useOpportunitiesStore((s) => s.duration);
  const deadline = useOpportunitiesStore((s) => s.deadline);
  const sort = useOpportunitiesStore((s) => s.sort);

  const filtered = useMemo(
    () =>
      selectFiltered({
        opportunities,
        search,
        activeCategories,
        activeSubjects,
        mode,
        funding,
        age,
        certificate,
        location,
        duration,
        deadline,
        sort,
      } as never),
    [
      opportunities,
      search,
      activeCategories,
      activeSubjects,
      mode,
      funding,
      age,
      certificate,
      location,
      duration,
      deadline,
      sort,
    ],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-[20px] bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <p className="text-destructive">{error}</p>
        <button onClick={fetch} className="mt-3 text-sm font-semibold text-primary underline">
          Retry
        </button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-1 gap-5 py-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {filtered.map((opportunity, i) => (
          <div
            key={opportunity.id}
            className="h-full animate-card-in"
            style={{ animationDelay: `${(i % 3) * 50}ms` }}
          >
            <OpportunityCard opportunity={opportunity} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
