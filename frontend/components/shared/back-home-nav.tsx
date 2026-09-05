"use client";

import { ArrowLeft, House } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";

/**
 * Compact Home + Back controls for bare pages (login/signup/forgot-password/
 * admin apply/register) that have no site nav. Matches the outline icon-button
 * style of the DirectionToggle. Back returns to the previous page when there is
 * history, and falls back to the homepage otherwise.
 */
export function BackHomeNav() {
  const { t } = useTranslation();
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(ROUTES.home);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goBack} aria-label={t("nav.goBack")}>
        <ArrowLeft className="size-4 rtl:rotate-180" />
      </Button>
      <Button variant="outline" size="icon" asChild aria-label={t("nav.home")}>
        <a href={ROUTES.home}>
          <House className="size-4" />
        </a>
      </Button>
    </div>
  );
}
