"use client";

import { type MessageKey, messages } from "@/lib/i18n";
import { useUIStore } from "@/stores/ui.store";

/** Returns the active locale and a `t(key)` translator bound to it. */
export function useTranslation() {
  const locale = useUIStore((s) => s.locale);
  const t = (key: MessageKey): string => messages[locale][key] ?? messages.en[key] ?? key;
  return { t, locale };
}
