import { api } from "@/lib/api-client";

import type { AdminApplication } from "../types";

/**
 * Admin application endpoints.
 *
 * `apply` is public: when called with a valid JWT the backend links the
 * application to the caller's existing account (no second account is created).
 * When called without a token and the email has no account yet, the backend
 * creates a normal account for the applicant and links the application to it —
 * `password` is used for that new account so they can sign in immediately (with
 * no password the account is passwordless and "forgot password" sets one).
 * An existing account's password is never changed.
 * `request_type` selects the flow: "admin" (researcher) or "org" (organization
 * admin). Website is optional in both.
 */
export const applyApi = {
  apply: (data: {
    email: string;
    password?: string;
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
