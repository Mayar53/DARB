import { api } from "@/lib/api-client";
import type { User } from "@/lib/types";

import type { AdminApplication, AdminLeaderboardEntry, Organization, Permission } from "../types";

/**
 * OWNER-only endpoints. Every call requires the caller's JWT and the backend
 * rejects them with 403 unless the user has the matching permission
 * (role=owner passes all checks).
 */
export const adminApi = {
  // --- Admin applications (owner review) ---
  /** "admin" for research/opportunity admins, "org" for organization admins. */
  listApplications: (requestType?: "admin" | "org") => {
    const query = requestType ? `?request_type=${requestType}` : "";
    return api.get<AdminApplication[]>(`/auth/admin-applications${query}`);
  },
  approveApplication: (id: number) =>
    api.post<AdminApplication>(`/auth/admin-applications/${id}/approve`),
  waitlistApplication: (id: number) =>
    api.post<AdminApplication>(`/auth/admin-applications/${id}/waitlist`),
  /** Move a waitlisted application back to Pending for a fresh decision. */
  pendingApplication: (id: number) =>
    api.post<AdminApplication>(`/auth/admin-applications/${id}/pending`),
  /** Decline an application — record kept, user not promoted. */
  declineApplication: (id: number) =>
    api.post<AdminApplication>(`/auth/admin-applications/${id}/reject`),
  /** Reject an application — record kept, user not promoted. */
  rejectApplication: (id: number) =>
    api.post<AdminApplication>(`/auth/admin-applications/${id}/reject`),
  /** Staff/admin users with no application record (registered/created directly). */
  listUnappliedStaff: () => api.get<User[]>("/auth/admin-applications/unapplied"),
  /** Create a pending application record for a staff user without one. */
  createApplicationForUser: (userId: number) =>
    api.post<AdminApplication>("/auth/admin-applications/create-for-user", {
      user_id: userId,
    }),

  // --- Permission catalog (rendered as checkboxes) ---
  listPermissions: () => api.get<Permission[]>("/auth/permissions"),

  // --- Users / admins ---
  listUsers: () => api.get<User[]>("/auth/users"),
  listAdmins: () => api.get<User[]>("/auth/admins"),
  /** Active admins ranked by real contribution counts (owner-only). */
  leaderboard: () => api.get<AdminLeaderboardEntry[]>("/auth/admins/leaderboard"),
  createAdmin: (data: { email: string; password: string; full_name: string; nickname?: string }) =>
    api.post<User>("/auth/admins", data),
  updateAdmin: (
    id: number,
    data: { is_active?: boolean; permissions?: string[]; organization_ids?: number[] },
  ) => api.patch<User>(`/auth/admins/${id}`, data),

  // --- Organizations ---
  listOrganizations: () => api.get<Organization[]>("/auth/organizations"),
};
