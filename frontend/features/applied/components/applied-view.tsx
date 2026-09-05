"use client";

import { useTranslation } from "@/hooks/use-translation";

import { AppliedList } from "./applied-list";

/** Heading + grid for the /applied page (client — uses the i18n hook). */
export function AppliedView() {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {t("home.appliedTitle")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("home.appliedSubtitle")}</p>
      </div>
      <AppliedList />
    </>
  );
}
