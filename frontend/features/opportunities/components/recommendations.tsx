"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useApplied } from "@/features/applied";
import { useSaved } from "@/features/saved";
import { useTranslation } from "@/hooks/use-translation";
import { categoryInfo } from "@/lib/constants";
import { localizedField } from "@/lib/utils";
import type { OpportunityCardView } from "../types";

import { selectClosingThisWeek, selectMadeForYou, useOpportunitiesStore } from "../store/opportunities.store";

function MiniCard({ opportunity }: { opportunity: OpportunityCardView }) {
  const { t, locale } = useTranslation();
  const cat = categoryInfo(opportunity.category);
  const loc: "ar" | "en" = locale === "en" ? "en" : "ar";
  const title = localizedField(opportunity, "title", loc);
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="group flex min-w-[260px] max-w-[260px] flex-col gap-2 rounded-[16px] border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--cat-color)] hover:shadow-[0_12px_28px_rgba(14,71,73,0.12)]"
      style={{ "--cat-color": cat.color } as React.CSSProperties}
    >
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: cat.color }}
      >
        {t(cat.labelKey)}
      </span>
      <h3 className="line-clamp-2 font-heading text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
        {title}
      </h3>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-secondary">
          <Clock className="size-3.5" />
          {t("home.closes")} {opportunity.deadline}
        </span>
        <ArrowUpRight className="size-4 text-primary rtl:rotate-180" />
      </div>
    </Link>
  );
}

/** Home-page recommendation rows: "Made for you" + "Closing this week". */
export function Recommendations() {
  const { t } = useTranslation();
  // Select only the opportunity list — not the whole store — so filter/search
  // interactions never re-render the recs rows.
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const { savedIds } = useSaved();
  const { appliedIds } = useApplied();

  const viewedIds = useMemo(() => new Set<number>(), []);
  const likedIds = useMemo(
    () => new Set<number>([...savedIds, ...appliedIds]),
    [savedIds, appliedIds],
  );

  const made = useMemo(
    () => selectMadeForYou({ opportunities } as never, likedIds, viewedIds),
    [opportunities, likedIds, viewedIds],
  );
  const closing = useMemo(
    () => selectClosingThisWeek({ opportunities } as never),
    [opportunities],
  );

  if (made.length === 0 && closing.length === 0) return null;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6">
      {made.length > 0 && (
        <div className="recs-row">
          <h2 className="font-heading text-xl font-bold text-foreground">{t("recs.madeForYou")}</h2>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {made.map((o) => (
              <MiniCard key={o.id} opportunity={o} />
            ))}
          </div>
        </div>
      )}
      {closing.length > 0 && (
        <div className="recs-row">
          <h2 className="font-heading text-xl font-bold text-foreground">{t("recs.closingThisWeek")}</h2>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {closing.map((o) => (
              <MiniCard key={o.id} opportunity={o} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
