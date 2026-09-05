"use client";

import { create } from "zustand";

import { appliedApi } from "@/features/applied/api/applied.api";
import { savedApi } from "@/features/saved/api/saved.api";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Shared engagement state: the signed-in user's saved + applied opportunity ids.
 *
 * Previously every card mounted its own `useSaved()`/`useApplied()` hook, and
 * each hook fired its own GET /saved + GET /applied on mount — so a page with
 * N cards made 2N identical requests on every navigation. This store loads the
 * two lists once per session (when an access token exists) and every button
 * reads the same state, so navigation is one set of requests, not N.
 */
interface EngagementState {
  savedIds: Set<number>;
  appliedIds: Set<number>;
  loaded: boolean;
  loading: boolean;
  /** Load both lists once; safe to call repeatedly (deduped while loading). */
  load: () => Promise<void>;
  /** Local + server updates for a toggle. */
  setSaved: (id: number, saved: boolean) => void;
  setApplied: (id: number, applied: boolean) => void;
  reset: () => void;
}

let loadPromise: Promise<void> | null = null;

export const useEngagementStore = create<EngagementState>((set, get) => ({
  savedIds: new Set(),
  appliedIds: new Set(),
  loaded: false,
  loading: false,

  load: async () => {
    const { loading } = get();
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;
    if (loading) return loadPromise ?? Promise.resolve();
    if (get().loaded) return;

    set({ loading: true });
    loadPromise = (async () => {
      try {
        const [saved, applied] = await Promise.all([savedApi.list(), appliedApi.list()]);
        set({
          savedIds: new Set(saved.map((s) => s.opportunity_id)),
          appliedIds: new Set(applied.map((a) => a.opportunity_id)),
          loaded: true,
        });
      } finally {
        set({ loading: false });
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  setSaved: (id, saved) =>
    set((state) => {
      const next = new Set(state.savedIds);
      if (saved) next.add(id);
      else next.delete(id);
      return { savedIds: next };
    }),

  setApplied: (id, applied) =>
    set((state) => {
      const next = new Set(state.appliedIds);
      if (applied) next.add(id);
      else next.delete(id);
      return { appliedIds: next };
    }),

  reset: () => set({ savedIds: new Set(), appliedIds: new Set(), loaded: false, loading: false }),
}));
