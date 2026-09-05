import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Tokens, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** True once the persisted session has been rehydrated from storage. */
  hydrated: boolean;
  /** True while the session is being re-validated against the backend. */
  checkingSession: boolean;

  setSession: (user: User, tokens: Tokens) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  refreshUser: (user: User) => void;
  setHydrated: (value: boolean) => void;
  setCheckingSession: (value: boolean) => void;
  clear: () => void;
}

/**
 * Global auth store — the single source of truth for the session.
 * Persisted to localStorage so reloads keep the user signed in.
 * The API client (`lib/api-client.ts`) reads/writes tokens here via getState().
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      checkingSession: false,

      setSession: (user, tokens) =>
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
          checkingSession: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      /** Keep the session but replace the profile with fresh data from the API. */
      refreshUser: (user) => set({ user, isAuthenticated: true }),

      setHydrated: (value) => set({ hydrated: value }),
      setCheckingSession: (value) => set({ checkingSession: value }),

      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          checkingSession: false,
        }),
    }),
    {
      name: "app-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
