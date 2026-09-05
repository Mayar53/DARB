"use client";

import { ArrowUpRight, Banknote, Clock, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

import { AppliedButton } from "@/features/applied";
import { SaveButton } from "@/features/saved";
import { categoryInfo, fieldInfo, fundingLabelKey, fundingShowsPrice } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import { localizedField, cn } from "@/lib/utils";

import type { OpportunityCardView } from "../types";

function formatDeadline(date: string | null, locale: string): string {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

/** Opportunity card — exact draft.css structure and colors, plus save button. */
export function OpportunityCard({
  opportunity,
  locale,
}: {
  opportunity: OpportunityCardView;
  locale: string;
}) {
  const { t } = useTranslation();
  const cat = categoryInfo(opportunity.category);
  const closed = opportunity.closed;
  const closingSoon = opportunity.closingSoon;
  const loc: "ar" | "en" = locale === "en" ? "en" : "ar";
  const title = localizedField(opportunity, "title", loc);
  const description = localizedField(opportunity, "description", loc);

  return (
    <article
      className="group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-[20px] border border-border bg-card p-[22px] transition-all duration-200 ease-[var(--ease)] hover:-translate-y-1 hover:border-[var(--cat-color)] hover:shadow-[0_18px_40px_rgba(14,71,73,0.16)]"
      style={{ "--cat-color": cat.color } as React.CSSProperties}
    >
      <span className="absolute inset-y-0 start-0 w-[5px] bg-[var(--cat-color)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {/* Top row: category chip (start) + actions (end) — fixed height so every card aligns. */}
      <div className="flex min-h-8 items-start justify-between gap-2">
        <span
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: cat.color }}
        >
          {t(cat.labelKey)}
          {closed && <span className="rounded-full bg-white/25 px-1.5 py-px text-[10px]">●</span>}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {closingSoon && !closed && (
            <span className="hidden items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground sm:inline-flex">
              {t("home.closingSoon")}
            </span>
          )}
          <AppliedButton opportunityId={opportunity.id} />
          <SaveButton opportunityId={opportunity.id} />
        </div>
      </div>

      <Link href={`/opportunities/${opportunity.id}`} className="flex flex-1 flex-col gap-3.5">
        <h3 className="font-heading text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
          {title}
        </h3>

        {/* Field tags — consistent area on every card (reserves space when empty). */}
        <div className="flex min-h-[1.625rem] flex-wrap items-center gap-1.5">
          {opportunity.fields && opportunity.fields.length > 0 ? (
            opportunity.fields.map((key) => {
              const field = fieldInfo(key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: field.color }} />
                  {t(field.labelKey)}
                </span>
              );
            })
          ) : (
            <span className="hidden" aria-hidden />
          )}
        </div>

        <p className="min-h-[4.5rem] flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-col gap-1.5 text-[13px] text-foreground">
          {opportunity.location && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 opacity-60" />
              {opportunity.location}
              {" · "}
              {t(
                opportunity.mode === "online"
                  ? "home.modeOnline"
                  : opportunity.mode === "in-person"
                    ? "home.modeInPerson"
                    : "home.modeHybrid",
              )}
            </div>
          )}
          {opportunity.duration && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 opacity-60" />
              {opportunity.duration}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Banknote className="size-4 shrink-0 opacity-60" />
            {fundingShowsPrice(opportunity.funding) && opportunity.price?.trim()
              ? `${t(fundingLabelKey(opportunity.funding))} — ${opportunity.price.trim()}`
              : t(fundingLabelKey(opportunity.funding))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-[12.5px] font-semibold",
                closed ? "text-destructive" : closingSoon ? "text-secondary" : "text-accent",
              )}
            >
              {closed
                ? t("home.closed")
                : opportunity.deadline
                  ? `${t("home.closes")} ${formatDeadline(opportunity.deadline, locale)}`
                  : ""}
            </span>
            {opportunity.comment_count != null && opportunity.comment_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                <MessageCircle className="size-3.5" />
                {opportunity.comment_count}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-primary transition-colors group-hover:text-accent">
            {t("home.apply")}
            <ArrowUpRight className="size-4 rtl:rotate-180" />
          </span>
        </div>
      </Link>
    </article>
  );
}
