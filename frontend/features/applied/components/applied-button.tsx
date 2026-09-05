"use client";

import { Check } from "lucide-react";

import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { useApplied } from "../hooks/use-applied";

/** Compact applied toggle — icon-only on cards, with an accessible label + tooltip. */
export function AppliedButton({ opportunityId, className }: { opportunityId: number; className?: string }) {
  const { t } = useTranslation();
  const { isApplied, toggle } = useApplied();
  const applied = isApplied(opportunityId);
  const label = applied ? t("home.appliedUnmark") : t("home.appliedMark");

  return (
    <button
      type="button"
      onClick={() => void toggle(opportunityId)}
      aria-pressed={applied}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        applied
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Check className={cn("size-4", applied && "fill-current")} />
    </button>
  );
}
