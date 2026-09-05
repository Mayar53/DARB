"use client";

import { ArrowRight, CalendarDays, Dices, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CATEGORIES, categoryInfo, ROUTES } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

import { useOpportunitiesStore } from "../store/opportunities.store";

const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

function formatShortDeadline(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A decorative mini opportunity card shown behind/around the hero search on
 * larger screens. Uses a real published opportunity from the store (falling
 * back to nothing when the store is still empty), so nothing is hardcoded.
 */
function FloatingCard({
  opportunityId,
  className,
}: {
  opportunityId: number | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const opp =
    opportunities.find((o) => o.id === opportunityId) ?? opportunities[0] ?? null;
  if (!opp) return null;
  const cat = categoryInfo(opp.category);
  const deadline = formatShortDeadline(opp.deadline);
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute hidden w-52 select-none flex-col gap-2 rounded-2xl border border-border/80 bg-card/90 p-3.5 text-start shadow-[0_18px_50px_rgba(14,71,73,0.14)] backdrop-blur xl:flex",
        className,
      )}
    >
      <span
        className="inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: cat.color }}
      >
        {t(cat.labelKey)}
      </span>
      <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
        {opp.title}
      </span>
      <span className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {opp.funding === "paid"
            ? opp.price?.trim()
              ? `${t("home.fundingPaid")} · ${opp.price.trim()}`
              : t("home.fundingPaid")
            : t("home.fundingFree")}
        </span>
        {deadline && (
          <span className="inline-flex items-center gap-1 font-semibold text-secondary">
            <CalendarDays className="size-3" />
            {deadline}
          </span>
        )}
      </span>
    </div>
  );
}

/** Hero + search — the first thing visitors see, with floating opportunity
 *  visuals and clear CTAs. */
export function HeroSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const search = useOpportunitiesStore((s) => s.search);
  const setSearch = useOpportunitiesStore((s) => s.setSearch);
  const surprise = useOpportunitiesStore((s) => s.surprise);
  const clearSurprise = useOpportunitiesStore((s) => s.clearSurprise);
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  // Stable "now" so filtering is pure across renders (no Date.now in render).
  const [now] = useState(() => Date.now());

  const open = opportunities.filter((o) => {
    const deadline = o.deadline ? new Date(`${o.deadline}T23:59:59`) : null;
    return deadline === null || deadline.getTime() >= now;
  });
  // Two decorative cards: use a real "closing soon" pick + a random open pick.
  const closingSoon = open.find((o) => {
    const deadline = o.deadline ? new Date(`${o.deadline}T23:59:59`) : null;
    return deadline !== null && deadline.getTime() - now <= CLOSING_SOON_MS;
  });
  const sample = open[open.length > 1 ? 1 : 0];

  const handleSurprise = () => {
    clearSurprise();
    surprise();
    const pick = useOpportunitiesStore.getState().surprisePickId;
    if (pick !== null) router.push(`/opportunities/${pick}`);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // The grid below the hero filters live from the shared store — navigating
    // to #opportunities keeps the user on the page and shows filtered results.
    document.getElementById("opportunities")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Subtle brand gradient wash + decorative orbs + dotted texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent" />
        <div className="bg-orb-a absolute -top-24 start-[-6rem] size-[22rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="bg-orb-b absolute -top-16 end-[-8rem] size-[26rem] rounded-full bg-secondary/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in srgb, var(--primary) 18%, transparent) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
          }}
        />
        {/* A few sparkles */}
        <span className="absolute start-[12%] top-16 text-secondary/70">✦</span>
        <span className="absolute end-[16%] top-24 text-primary/50">✦</span>
        <span className="absolute bottom-10 start-[22%] text-primary/30">✦</span>
        <span className="absolute end-[8%] bottom-16 text-secondary/40">✦</span>
      </div>

      {/* Floating mini-cards — desktop only, purely decorative */}
      <FloatingCard opportunityId={closingSoon?.id ?? null} className="start-6 top-24 -rotate-3" />
      <FloatingCard opportunityId={sample?.id ?? null} className="end-6 top-32 rotate-2" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
          {t("home.tagline")}
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-primary sm:text-6xl">
          {t("home.heroTitle")}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t("home.heroSubtitle")}</p>

        {/* Search pill — the hero's primary action */}
        <form
          onSubmit={submitSearch}
          className="mt-2 w-full max-w-xl rounded-full bg-gradient-to-r from-primary via-secondary to-accent p-px shadow-lg shadow-primary/10 transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(14,71,73,0.12)]"
        >
          <div className="flex w-full items-center gap-2 rounded-full bg-card p-1.5 transition-all duration-300 focus-within:-translate-y-px focus-within:ring-4 focus-within:ring-primary/10">
            <Search className="ms-3 size-[18px] shrink-0 text-primary/65 transition-all duration-300 focus-within:scale-110 focus-within:text-primary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="h-[42px] w-full bg-transparent px-2 text-[14.5px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleSurprise}
              title={t("view.surprise")}
              className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-secondary/15 text-primary-dark transition-all duration-300 hover:-translate-y-px hover:bg-secondary hover:text-primary-dark hover:shadow-[0_6px_20px_rgba(212,162,78,0.35)] active:translate-y-0 sm:inline-flex"
            >
              <Dices className="size-5" />
            </button>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-full bg-gradient-to-br from-primary via-primary-dark to-[#0E4749] px-6 text-sm font-bold text-primary-foreground transition-all duration-300 hover:-translate-y-px hover:from-primary hover:to-secondary hover:shadow-[0_6px_20px_rgba(212,162,78,0.38)] active:translate-y-0"
            >
              {t("home.search")}
            </button>
          </div>
        </form>

        {/* Secondary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6">
            <Link href="#opportunities">
              {t("home.exploreOpportunities")}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
          {!isAuthenticated && (
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link href={ROUTES.signup}>
                <Sparkles className="size-4" />
                {t("home.createAccount")}
              </Link>
            </Button>
          )}
        </div>

        {/* Category chips — quick links that filter the grid */}
        <div className="mt-1 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.key}
              href="#opportunities"
              onClick={() => {
                const store = useOpportunitiesStore.getState();
                if (!store.activeCategories.includes(cat.key)) {
                  store.toggleCategory(cat.key);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: categoryInfo(cat.key).color }}
              />
              {t(cat.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
