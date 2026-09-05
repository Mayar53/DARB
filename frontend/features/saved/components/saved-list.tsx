"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OpportunityCard, opportunitiesApi } from "@/features/opportunities";
import type { OpportunityCardView } from "@/features/opportunities";
import { useTranslation } from "@/hooks/use-translation";
import type { Opportunity } from "@/lib/types";

import { useSaved } from "../hooks/use-saved";

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

/** Grid of the signed-in user's saved opportunities (reuses the home card). */
export function SavedList() {
  const { t, locale } = useTranslation();
  const { savedIds, loaded } = useSaved();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!loaded) return;
      try {
        const all = await opportunitiesApi.list();
        if (!cancelled) setOpportunities(all.filter((o) => savedIds.has(o.id)));
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
  }, [loaded, savedIds]);

  if (loading || !loaded) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {t("home.storiesSavedEmpty")}{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          {t("home.back")}
        </Link>
      </div>
    );
  }

  const closingSoon = opportunities
    .map((o) => ({ o, view: toCardView(o) }))
    .filter(({ view }) => view.closingSoon && !view.closed);
  const reminderText = closingSoon.length === 1 ? t("home.reminderText") : t("home.reminderTextPlural");

  return (
    <>
      {closingSoon.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-secondary/60 bg-secondary/15 px-5 py-2.5 text-center text-sm font-semibold text-primary-dark"
        >
          <span>
            {reminderText.replace("{n}", String(closingSoon.length))}{" "}
            <Link
              href={`/opportunities/${closingSoon[0].o.id}`}
              className="font-bold underline underline-offset-2 hover:text-accent"
            >
              {t("home.reminderView")}
            </Link>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="h-full">
            <OpportunityCard opportunity={toCardView(opportunity)} locale={locale} />
          </div>
        ))}
      </div>
    </>
  );
}
