import { api } from "@/lib/api-client";

import type { CreateOpportunityInput, UpdateOpportunityInput } from "../types";
import type { Opportunity } from "@/lib/types";

/** All opportunities endpoints in one place — every call goes through the api client. */
export const opportunitiesApi = {
  /** Public listing — active opportunities only. */
  list: () => api.get<Opportunity[]>("/opportunities", { auth: false }),
  /** Public detail — a single active opportunity. */
  get: (id: number) => api.get<Opportunity>(`/opportunities/${id}`, { auth: false }),
  /** Staff-only: the admin panel needs to see inactive rows too. */
  listAll: () => api.get<Opportunity[]>("/opportunities/all"),
  /** Staff-only: the authenticated admin's own opportunities (any status). */
  listMine: () => api.get<Opportunity[]>("/opportunities/mine"),
  create: (data: CreateOpportunityInput) =>
    api.post<Opportunity>("/opportunities", data),
  update: (id: number, data: UpdateOpportunityInput) =>
    api.put<Opportunity>(`/opportunities/${id}`, data),
  remove: (id: number) => api.delete<void>(`/opportunities/${id}`),
};
