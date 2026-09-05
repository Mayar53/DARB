"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OpportunityCard, opportunitiesApi } from "@/features/opportunities";
import type { OpportunityCardView } from "@/features/opportunities";
import { useTranslation } from "@/hooks/use-translation";
import type { Opportunity } from "@/lib/types";

import { useApplied } from "../hooks/use-applied";

/** Derive the card view flags (closed / closing soon) from a deadline string. */
function toCardView(o: Opportunity): OpportunityCardView {
  const now = new Date();
  const deadline = o.deadline ? new Date(`${o.deadline}T23:59:59`) : null;
  const closed = deadline !== null && deadline.getTime() < now.getTime();
  const closingSoon =
    deadline !== null &&
    !closed &&
    deadline.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
  return { ...o, closed, closingSoon };
}

/** Grid of the signed-in user's applied opportunities (reuses the home card). */
export function AppliedList() {
  const { t, locale } = useTranslation();
  const { appliedIds, loaded } = useApplied();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!loaded) return;
      try {
        const all = await opportunitiesApi.list();
        if (!cancelled) setOpportunities(all.filter((o) => appliedIds.has(o.id)));
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [loaded, appliedIds]);

  if (loading || !loaded) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {t("home.appliedEmpty")}{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          {t("home.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {opportunities.map((opportunity) => (
        <div key={opportunity.id} className="h-full">
          <OpportunityCard opportunity={toCardView(opportunity)} locale={locale} />
        </div>
      ))}
    </div>
  );
}
