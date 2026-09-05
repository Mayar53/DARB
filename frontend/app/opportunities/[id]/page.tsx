"use client";

import { ArrowUpRight, Award, Banknote, Building2, CalendarDays, Clock, ExternalLink, Globe, MapPin, Share2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { opportunitiesApi } from "@/features/opportunities";
import { AppliedButton } from "@/features/applied";
import { CommentList } from "@/features/comments";
import { SaveButton } from "@/features/saved";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { categoryInfo, fundingLabelKey, fundingShowsPrice, ROUTES } from "@/lib/constants";
import { localizedField } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";

import { ShareDialog } from "@/features/social/components/share-dialog";

function formatDeadline(date: string | null, locale: string): string {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A valid absolute http(s) URL — never render a broken link from empty/garbage. */
function isValidHttpUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Funding label + price when applicable — e.g. "Free", "Fully funded",
 *  "Paid — $25", "Partially funded — $50". */
function FundingValue({ opportunity }: { opportunity: Opportunity }) {
  const { t } = useTranslation();
  const price = opportunity.price?.trim();
  return (
    <span className="font-medium">
      {t(fundingLabelKey(opportunity.funding))}
      {fundingShowsPrice(opportunity.funding) && price ? (
        <>
          {" "}
          <span className="text-primary">— {price}</span>
        </>
      ) : null}
    </span>
  );
}

/** Public detail page: full description, meta, save button, comment feed. */
export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = useTranslation();
    const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [now] = useState(() => Date.now());
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        const opp = await opportunitiesApi.get(Number(id));
        if (!cancelled) setOpportunity(opp);
      } catch (error) {
        if (!cancelled) {
          setNotFound(true);
          toast.error(error instanceof Error ? error.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center p-12 text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (notFound || !opportunity) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center gap-4 p-12 text-center">
        <p className="text-muted-foreground">{t("home.empty")}</p>
        <Link href={ROUTES.home} className="font-semibold text-primary hover:underline">
          {t("home.back")}
        </Link>
      </div>
    );
  }

  const cat = categoryInfo(opportunity.category);
  const closed = opportunity.deadline
    ? new Date(`${opportunity.deadline}T23:59:59`).getTime() < now
    : false;
  const closingSoon =
    opportunity.deadline &&
    !closed &&
    new Date(`${opportunity.deadline}T23:59:59`).getTime() - now <= 7 * 24 * 60 * 60 * 1000;
  const hasApplyUrl = isValidHttpUrl(opportunity.apply_url);
  const hasOrgWebsite = isValidHttpUrl(opportunity.organization_website);
  const modeKey =
    opportunity.mode === "in-person"
      ? "home.modeInPerson"
      : opportunity.mode === "hybrid"
        ? "home.modeHybrid"
        : "home.modeOnline";
  const loc: "ar" | "en" = locale === "en" ? "en" : "ar";
  const detailTitle = localizedField(opportunity, "title", loc);
  const detailDescription = localizedField(opportunity, "description", loc);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Link
        href={ROUTES.home}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowUpRight className="size-4 rotate-180 rtl:rotate-0" />
        {t("home.back")}
      </Link>

      <article className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: cat.color }}
          >
            {t(cat.labelKey)}
          </span>
          {closed && (
            <span className="rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive">
              {t("home.closed")}
            </span>
          )}
          {closingSoon && (
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground">
              {t("home.closingSoon")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {detailTitle}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <AppliedButton opportunityId={opportunity.id} />
            <SaveButton opportunityId={opportunity.id} />
            {opportunity.status === "published" || (!opportunity.status && opportunity.is_active) ? (
              <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="size-3.5" />
                {t("share.openPreview")}
              </Button>
            ) : null}
          </div>
        </div>

        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90">
          {detailDescription}
        </p>

        {/* Details card — category, location, mode, duration, deadline, funding/price, NGO + website */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 opacity-60" />
            <span className="font-medium">{t(cat.labelKey)}</span>
          </div>
          {opportunity.location && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 opacity-60" />
              <span className="font-medium">{opportunity.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Globe className="size-4 shrink-0 opacity-60" />
            <span className="font-medium">{t(modeKey)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 opacity-60" />
            <span className="font-medium">
              {opportunity.age === "all" ? t("home.ageAll") : opportunity.age}
            </span>
          </div>
          {opportunity.duration && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 opacity-60" />
              <span className="font-medium">{opportunity.duration}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 opacity-60" />
            <span className="font-medium">
              {closed
                ? t("home.closed")
                : opportunity.deadline
                  ? `${t("home.closes")} ${formatDeadline(opportunity.deadline, locale)}`
                  : t("home.noDeadline")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="size-4 shrink-0 opacity-60" />
            <FundingValue opportunity={opportunity} />
          </div>
          <div className="flex items-center gap-2">
            <Award className="size-4 shrink-0 opacity-60" />
            <span className="font-medium">
              {opportunity.certificate
                ? t("home.certificateOffered")
                : t("home.certificateNotOffered")}
            </span>
          </div>
          {opportunity.organization_name && (
            <div className="flex items-center gap-2">
              <Building2 className="size-4 shrink-0 opacity-60" />
              <span className="font-medium">{opportunity.organization_name}</span>
            </div>
          )}
          {hasOrgWebsite && (
            <a
              href={opportunity.organization_website}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary"
            >
              <ExternalLink className="size-3.5" />
              {t("home.ngoWebsite")}
            </a>
          )}
        </div>

        {hasApplyUrl && (
          <a
            href={opportunity.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            {t("home.apply")}
            <ArrowUpRight className="size-4 rtl:rotate-180" />
          </a>
        )}
      </article>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          {t("comments.title")}
        </h2>
        <CommentList target={{ opportunityId: opportunity.id }} />
      </section>

      {opportunity && (
        <ShareDialog
          opportunity={opportunity}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}
    </div>
  );
}
