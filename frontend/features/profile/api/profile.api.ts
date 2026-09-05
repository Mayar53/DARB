import { api } from "@/lib/api-client";
import type { PublicProfile } from "@/lib/types";

/** Public profile endpoints — no auth required (never exposes private data). */
export const profileApi = {
  getPublic: (userId: number) =>
    api.get<PublicProfile>(`/auth/users/${userId}/public`, { auth: false }),
};
