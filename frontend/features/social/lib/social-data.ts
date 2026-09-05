import type { MessageKey } from "@/lib/i18n";
import type { Opportunity } from "@/lib/types";

import { categoryInfo } from "@/lib/constants";
import { localizedField } from "@/lib/utils";

/** Normalized, display-ready data for a graphic/caption — only real values. */
export interface GraphicData {
  id: number;
  title: string;
  /** Short description excerpt (never the full text). */
  excerpt: string;
  categoryKey: string;
  categoryLabel: string;
  categoryColor: string;
  modeLabel: string;
  location: string;
  duration: string;
  deadline: string;
  /** "FREE" / "PAID" display text. */
  fundingLabel: string;
  /** Stored price text, trimmed; empty when not provided. */
  price: string;
  /** "PAID — $50" when paid with a price, else the funding label. */
  fundingDisplay: string;
  paid: boolean;
  organizationName: string;
  /** Display label for the age group (e.g. "13-15", "All ages"). */
  ageDisplay: string;
  /** True when a certificate is offered. */
  certificate: boolean;
  /** Absolute direct link to the opportunity page. */
  directUrl: string;
}

/** Labels resolved through the same i18n keys the app uses. */
export interface SocialLabels {
  modeOnline: string;
  modeInPerson: string;
  modeHybrid: string;
  fundingFree: string;
  fundingPaid: string;
  /** "Fully funded" — distinct funding state in Darb. */
  fundingFullyFunded: string;
  /** "Partially funded" — distinct funding state in Darb. */
  fundingPartiallyFunded: string;
  /** "All ages" — used on the graphic when the opportunity has no age limit. */
  ageAll: string;
  /** "Certificate offered" / short certificate label for the detail chip. */
  certificateOffered: string;
}

const SUPPORTED_LOCALES = ["ar", "en"] as const;

/** Normalize the locale to one the app can render (fall back to Arabic). */
export function safeLocale(locale: string | undefined): "ar" | "en" {
  return SUPPORTED_LOCALES.includes(locale as "ar" | "en") ? (locale as "ar" | "en") : "ar";
}

/** Format an ISO date (YYYY-MM-DD) for a locale, like the detail page does. */
export function formatDeadline(date: string | null | undefined, locale: string): string {
  if (!date) return "";
  const loc = safeLocale(locale);
  return new Date(`${date}T00:00:00`).toLocaleDateString(loc === "ar" ? "ar" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Summarize a description for a graphic: keep the leading sentence(s) that fit
 * within ``max`` characters and end on a clean boundary (never mid-word or with
 * a dangling punctuation mess). Longer text becomes a concise teaser — the
 * graphic never shows the whole description.
 *
 * Strategy (per locale-agnostic rules):
 *  1. Collapse whitespace.
 *  2. Prefer a sentence boundary (". ", "! ", "؟ ", "? ") that fits under max.
 *  3. Otherwise cut at the last word boundary under max.
 * Always appends "…" when anything was removed.
 */
export function excerpt(description: string, max = 140): string {
  const cleaned = description.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const hardCap = cleaned.slice(0, max);

  // Sentence boundary first — keeps the summary readable (Arabic + Latin).
  const sentenceEnd = hardCap.search(/[.!؟?]\s/);
  if (sentenceEnd > 0) {
    return `${cleaned.slice(0, sentenceEnd + 1).trimEnd()}…`;
  }

  const lastSpace = hardCap.lastIndexOf(" ");
  const cut = lastSpace > 0 ? hardCap.slice(0, lastSpace) : hardCap;
  return `${cut.trimEnd()}…`;
}

/**
 * Build the full display dataset for an opportunity. Every field is resolved to
 * a real value or an empty string — no "null"/"undefined" ever reaches the UI.
 */
export function buildGraphicData(
  opp: Opportunity,
  locale: string,
  labels: SocialLabels,
  origin: string,
  excerptMax = 140,
): GraphicData {
  const cat = categoryInfo(opp.category);
  const paid = opp.funding === "paid";
  const price = (opp.price ?? "").trim();
  const loc: "ar" | "en" = locale === "en" ? "en" : "ar";
  const title = localizedField(opp, "title", loc);
  const description = localizedField(opp, "description", loc);

  const modeLabel =
    opp.mode === "online"
      ? labels.modeOnline
      : opp.mode === "in-person"
        ? labels.modeInPerson
        : opp.mode === "hybrid"
          ? labels.modeHybrid
          : "";

  const fundingLabel = paid ? labels.fundingPaid : labels.fundingFree;
  // "Fully funded"/"Partially funded" are distinct funding states in Darb;
  // partially funded also shows its price when one is provided.
  const isFullyFunded = opp.funding === "fully-funded";
  const isPartiallyFunded = opp.funding === "partially-funded";
  const showsPrice = paid || isPartiallyFunded;
  const baseLabel = isFullyFunded
    ? labels.fundingFullyFunded
    : isPartiallyFunded
      ? labels.fundingPartiallyFunded
      : fundingLabel;
  const fundingDisplay =
    showsPrice && price
      ? paid
        ? `${labels.fundingPaid} — ${price}`
        : `${labels.fundingPartiallyFunded} — ${price}`
      : baseLabel;

  const ageDisplay =
    !opp.age || opp.age === "all" ? labels.ageAll : opp.age;

  return {
    id: opp.id,
    title: title.trim(),
    excerpt: excerpt(description, excerptMax),
    categoryKey: opp.category,
    categoryLabel: cat.labelKey,
    categoryColor: cat.color,
    modeLabel,
    location: (opp.location ?? "").trim(),
    duration: (opp.duration ?? "").trim(),
    deadline: formatDeadline(opp.deadline, locale),
    fundingLabel,
    price,
    fundingDisplay,
    paid,
    organizationName: (opp.organization_name ?? "").trim(),
    ageDisplay,
    certificate: Boolean(opp.certificate),
    directUrl: `${origin}/opportunities/${opp.id}`,
  };
}

/** Typed helper: resolve an i18n MessageKey via a translator function. */
export type Translator = (key: MessageKey) => string;
