"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";

/** Keeps <html dir/lang> in sync with the UI store (locale ⇄ direction). */
function DirectionSync() {
  const direction = useUIStore((s) => s.direction);
  const locale = useUIStore((s) => s.locale);
  useEffect(() => {
    const el = document.documentElement;
    el.dir = direction;
    el.lang = locale;
  }, [direction, locale]);
  return null;
}

/**
 * Runs once after the persisted auth store rehydrates:
 * - No stored session → nothing to do.
 * - Stored session → re-validate it against the backend with GET /auth/me
 *   (the api client transparently refreshes an expired access token first).
 *   On success the stored profile is refreshed from the DB (admin status,
 *   nickname, avatar stay current). Only when refresh genuinely fails is the
 *   stale session dropped, so a returning user stays signed in.
 */
function SessionRefresh() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const clear = useAuthStore((s) => s.clear);
  const setCheckingSession = useAuthStore((s) => s.setCheckingSession);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    let cancelled = false;
    setCheckingSession(true);
    void import("@/features/auth").then(({ authApi }) =>
      authApi
        .me()
        .then((user) => {
          if (!cancelled) refreshUser(user);
        })
        .catch(() => {
          // Access token expired and refresh failed → drop the stale session.
          if (!cancelled) clear();
        })
        .finally(() => {
          if (!cancelled) setCheckingSession(false);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, refreshUser, clear, setCheckingSession]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DirectionSync />
      <SessionRefresh />
      {children}
    </ThemeProvider>
  );
}
