import { api } from "@/lib/api-client";
import type { Gamification } from "@/lib/types";

/** All gamification endpoints — points/badges + view tracking. */
export const gamificationApi = {
  me: () => api.get<Gamification>("/gamification/me"),
  recordView: (opportunityId: number) =>
    api.post<void>(`/gamification/views/${opportunityId}`, undefined, { auth: true }),
};
