"use client";

import { Bookmark } from "lucide-react";

import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { useSaved } from "../hooks/use-saved";

/** Compact bookmark toggle — icon-only on cards, with an accessible label + tooltip. */
export function SaveButton({ opportunityId, className }: { opportunityId: number; className?: string }) {
  const { t } = useTranslation();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(opportunityId);
  const label = saved ? t("home.storiesSaved") : t("home.storiesSave");

  return (
    <button
      type="button"
      onClick={() => void toggle(opportunityId)}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        saved
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
