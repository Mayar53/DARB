"use client";

import { useEffect } from "react";

import {
  CategoryPills,
  FaqAccordion,
  FilterBar,
  HeroSearch,
  OpportunityGrid,
  Recommendations,
  SiteFooter,
  SiteNav,
  SubjectPills,
  useOpportunitiesStore,
} from "@/features/opportunities";
import { DeadlineAlert } from "@/features/saved";

export default function Home() {
  const fetchOpportunities = useOpportunitiesStore((s) => s.fetch);

  useEffect(() => {
    void fetchOpportunities();
  }, [fetchOpportunities]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />

      <main className="flex flex-1 flex-col">
        <HeroSearch />

        <div className="flex flex-col gap-8 py-10" id="opportunities">
          <DeadlineAlert />
          <Recommendations />
          <CategoryPills />
          <SubjectPills />

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <FilterBar />
          </div>

          <OpportunityGrid />
        </div>

        <FaqAccordion />
      </main>

      <SiteFooter />
    </div>
  );
}
