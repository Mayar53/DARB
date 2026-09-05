"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { useEngagementStore } from "@/stores/engagement.store";

import { appliedApi } from "../api/applied.api";

/**
 * Applied-opportunity state, backed by the shared engagement store so every
 * "applied" toggle reads ONE fetch instead of firing its own per card.
 * The server remains the source of truth for the initial load; toggles update
 * both local state and the server.
 */
export function useApplied() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const appliedIds = useEngagementStore((s) => s.appliedIds);
  const loaded = useEngagementStore((s) => s.loaded);
  const load = useEngagementStore((s) => s.load);
  const setApplied = useEngagementStore((s) => s.setApplied);

  // Load once when a session exists; reset when signed out.
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  /** Toggle applied state; redirects to login when signed out. */
  const toggle = async (opportunityId: number) => {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    const isApplied = appliedIds.has(opportunityId);
    // Optimistic local update; roll back on failure.
    setApplied(opportunityId, !isApplied);
    try {
      if (isApplied) {
        await appliedApi.remove(opportunityId);
      } else {
        await appliedApi.add(opportunityId);
      }
    } catch (error) {
      setApplied(opportunityId, isApplied);
      toast.error(error instanceof Error ? error.message : "Failed to update applied");
    }
  };

  return { appliedIds, isApplied: (id: number) => appliedIds.has(id), toggle, loaded };
}
