import { api } from "@/lib/api-client";
import type { SavedOpportunity } from "@/lib/types";

/** All saved endpoints in one place — every call goes through the api client. */
export const savedApi = {
  /** Auth required: the signed-in user's saved opportunity ids. */
  list: () => api.get<SavedOpportunity[]>("/saved"),
  add: (opportunityId: number) =>
    api.post<SavedOpportunity>("/saved", { opportunity_id: opportunityId }),
  remove: (opportunityId: number) =>
    api.delete<void>(`/saved/${opportunityId}`),
};
