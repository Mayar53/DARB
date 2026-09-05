"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useOpportunitiesStore } from "@/features/opportunities";
import { useTranslation } from "@/hooks/use-translation";

import { useSaved } from "../hooks/use-saved";

/** Deadline alert banner — shown when the signed-in user has saved
 *  opportunities closing within 7 days. Reuses the opportunities already loaded
 *  into the shared store on the home page instead of fetching a second copy. */
export function DeadlineAlert() {
  const { t } = useTranslation();
  const { savedIds, loaded } = useSaved();
  const storeOpportunities = useOpportunitiesStore((s) => s.opportunities);

  const closing = useMemo(() => {
    if (!loaded || savedIds.size === 0) return [];
    const now = new Date();
    return storeOpportunities.filter((o) => {
      if (!savedIds.has(o.id) || !o.deadline) return false;
      const deadline = new Date(`${o.deadline}T23:59:59`);
      return (
        deadline.getTime() >= now.getTime() &&
        deadline.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000
      );
    });
  }, [loaded, savedIds, storeOpportunities]);

  const text = useMemo(
    () =>
      (closing.length === 1 ? t("home.reminderText") : t("home.reminderTextPlural")).replace(
        "{n}",
        String(closing.length),
      ),
    [closing.length, t],
  );

  if (closing.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-secondary/60 bg-secondary/15 px-5 py-2.5 text-center text-sm font-semibold text-primary-dark"
      >
        <span>
          {text}{" "}
          <Link
            href={`/opportunities/${closing[0].id}`}
            className="font-bold underline underline-offset-2 hover:text-accent"
          >
            {t("home.reminderView")}
          </Link>
        </span>
      </div>
    </div>
  );
}
