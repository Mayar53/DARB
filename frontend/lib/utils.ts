import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { Locale } from "@/lib/i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Non-blank string or undefined (treats null/whitespace-only as absent). */
function clean(value: string | null | undefined): string | undefined {
  const v = value?.trim()
  return v ? v : undefined
}

/**
 * Resolve an opportunity's localizable text field for a locale.
 *
 * Rule: the per-language override ({field}_{locale}) wins when non-blank;
 * otherwise the base field (the universal/fallback text) is used — so content
 * is never empty and existing single-language data keeps working unchanged.
 */
type LocalizedContent = {
  title?: string;
  description?: string;
  title_ar?: string | null;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
};
type LocalizedField = "title" | "description";

export function localizedField(
  opportunity: LocalizedContent,
  field: LocalizedField,
  locale: Locale,
): string {
  const overrideKey = `${field}_${locale}` as const;
  const override = clean(opportunity[overrideKey]);
  const base = clean(opportunity[field]);
  return override ?? base ?? "";
}
