"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useUIStore } from "@/stores/ui.store";

/** Toggles language (ar ⇄ en, which also flips direction) and color theme. */
export function DirectionToggle() {
  const locale = useUIStore((s) => s.locale);
  const toggleLocale = useUIStore((s) => s.toggleLocale);
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLocale}
        aria-label={t("toggle.language")}
      >
        <Languages className="size-4" />
        {locale === "ar" ? "EN" : "ع"}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={t("toggle.theme")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>
    </div>
  );
}
