import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type Direction } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";

const DIRECTION_BY_LOCALE: Record<Locale, Direction> = { ar: "rtl", en: "ltr" };

interface UIState {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

/**
 * UI/layout store. Locale drives both the language and the text direction
 * (ar → rtl, en → ltr). Theme (dark/light) is owned by next-themes — see
 * `providers/app-providers.tsx`.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      locale: "ar",
      direction: DIRECTION_BY_LOCALE.ar,
      setLocale: (locale) => set({ locale, direction: DIRECTION_BY_LOCALE[locale] }),
      toggleLocale: () =>
        set((state) => {
          const locale: Locale = state.locale === "ar" ? "en" : "ar";
          return { locale, direction: DIRECTION_BY_LOCALE[locale] };
        }),
    }),
    { name: "app-ui" },
  ),
);
