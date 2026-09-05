"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { useEngagementStore } from "@/stores/engagement.store";

import { savedApi } from "../api/saved.api";

/**
 * Saved-opportunity state, backed by the shared engagement store so every
 * bookmark button on the page reads ONE fetch instead of firing its own.
 * The server remains the source of truth for the initial load; toggles update
 * both local state and the server.
 */
export function useSaved() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const savedIds = useEngagementStore((s) => s.savedIds);
  const loaded = useEngagementStore((s) => s.loaded);
  const load = useEngagementStore((s) => s.load);
  const setSaved = useEngagementStore((s) => s.setSaved);

  // Load once when a session exists; reset when signed out.
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  /** Toggle save state; redirects to login when signed out. */
  const toggle = async (opportunityId: number) => {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    const isSaved = savedIds.has(opportunityId);
    // Optimistic local update; roll back on failure.
    setSaved(opportunityId, !isSaved);
    try {
      if (isSaved) {
        await savedApi.remove(opportunityId);
      } else {
        await savedApi.add(opportunityId);
      }
    } catch (error) {
      setSaved(opportunityId, isSaved);
      toast.error(error instanceof Error ? error.message : "Failed to update saved");
    }
  };

  return { savedIds, isSaved: (id: number) => savedIds.has(id), toggle, loaded };
}
