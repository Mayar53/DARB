/** Mirrors the backend `AdminApplicationOut` ninja schema. */
export interface AdminApplication {
  id: number;
  email: string;
  full_name: string;
  nickname: string;
  organization: string;
  website: string;
  position: string;
  reason: string;
  /** "admin" (researcher) | "org" (organization admin) */
  request_type: string;
  status: string;
  user_id: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Mirrors the backend `PermissionOut` ninja schema. */
export interface Permission {
  key: string;
  label: string;
}

/** Mirrors the backend `OrganizationOut` ninja schema. */
export interface Organization {
  id: number;
  name: string;
  website: string;
  description: string;
  created_at: string;
}

/** Mirrors the backend `AdminLeaderboardEntryOut` ninja schema. */
export interface AdminLeaderboardEntry {
  admin_id: number;
  admin_name: string;
  nickname: string;
  avatar: string;
  total_opportunities: number;
  active_opportunities: number;
  opportunities: { id: number; title: string }[];
}

export type { User } from "@/lib/types";
