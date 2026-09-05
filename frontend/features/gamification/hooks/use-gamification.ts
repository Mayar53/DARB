"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth";
import { gamificationApi } from "../api/gamification.api";
import type { Gamification } from "@/lib/types";

/** Loads the caller's gamification (points + badges), recomputed server-side. */
export function useGamification() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<Gamification | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await gamificationApi.me());
    } catch {
      // Non-critical — the account page shows points when available.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await gamificationApi.me();
        if (!cancelled) setData(result);
      } catch {
        // Non-critical — the account page shows points when available.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return { data, loading, refresh };
}
