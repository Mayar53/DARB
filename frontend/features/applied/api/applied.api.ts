import { api } from "@/lib/api-client";
import type { AppliedOpportunity } from "@/lib/types";

/** All applied endpoints in one place — every call goes through the api client. */
export const appliedApi = {
  /** Auth required: the signed-in user's applied opportunity ids. */
  list: () => api.get<AppliedOpportunity[]>("/applied"),
  add: (opportunityId: number) =>
    api.post<AppliedOpportunity>("/applied", { opportunity_id: opportunityId }),
  remove: (opportunityId: number) =>
    api.delete<void>(`/applied/${opportunityId}`),
};
