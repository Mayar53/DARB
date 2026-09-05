"use client";

import { Bookmark } from "lucide-react";

import { useTranslation } from "@/hooks/use-translation";

import { SavedList } from "./saved-list";
import { useSaved } from "../hooks/use-saved";

/** Heading + count chip + grid for the /saved page (client — uses the i18n hook). */
export function SavedView() {
  const { t } = useTranslation();
  const { savedIds, loaded } = useSaved();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {t("home.storiesSavedTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("home.storiesSavedEmpty")}</p>
        </div>
        {loaded && savedIds.size > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-[0_2px_8px_rgba(14,71,73,0.06)]">
            <Bookmark className="size-4 fill-current" />
            {savedIds.size}
          </span>
        )}
      </div>
      <SavedList />
    </>
  );
}
