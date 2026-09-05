import { api } from "@/lib/api-client";

import type { AdminApplication } from "../types";

/**
 * Admin application endpoints.
 *
 * `apply` is public-ish: when called with a valid JWT the backend links the
 * application to the caller's existing account (no second account is created).
 * When called without a token it stores the application by email.
 * `request_type` selects the flow: "admin" (researcher) or "org" (organization
 * admin). Website is optional in both.
 */
export const applyApi = {
  apply: (data: {
    email: string;
    full_name: string;
    organization?: string;
    website?: string;
    position?: string;
    reason?: string;
    request_type?: "admin" | "org";
  }) => api.post<AdminApplication>("/auth/admin-apply", data, { auth: false }),
  /** Admin Registration: creates a normal account + a PENDING admin request. */
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    nickname: string;
    organization: string;
    website?: string;
    request_type?: "admin" | "org";
  }) => api.post<AdminApplication>("/auth/admin-register", data, { auth: false }),
  /** The signed-in user's own application (or null if they have none). */
  myApplication: () => api.get<AdminApplication | null>("/auth/my-admin-application"),
  status: (email: string) =>
    api.post<{ status: string }>("/auth/admin-application/status", { email }, { auth: false }),
};
