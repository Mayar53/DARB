/** Shared API contract types — mirror the backend django-ninja schemas. */

export interface User {
  id: number;
  email: string;
  full_name: string;
  nickname: string;
  avatar: string;
  is_active: boolean;
  is_staff: boolean;
  /** "user" | "admin" | "owner" — matches the backend role field. */
  role: string;
  permissions: string[];
  /** Gamification — present on /auth/me, login, register. */
  points?: number;
  badges?: Badge[];
}

/** A gamification badge (server-computed from real activity). */
export interface Badge {
  key: string;
  emoji: string;
  name: string;
  description: string;
}

/** Mirrors the backend `GamificationOut` ninja schema. */
export interface Gamification {
  points: number;
  badges: Badge[];
  stats: {
    saved: number;
    applied: number;
    stories: number;
    views: number;
    closing_soon_saved: number;
  };
}

/** Mirrors the backend `PublicProfileOut` ninja schema. */
export interface PublicProfile {
  id: number;
  nickname: string;
  avatar: string;
  points: number;
  badges: Badge[];
}

/** A subject-field node from GET /opportunities/subject-fields. */
export interface SubjectField {
  key: string;
  label_en: string;
  label_ar: string;
  parent: string | null;
  color: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

/** Mirrors the backend `OpportunityOut` ninja schema. */
export interface Opportunity {
  id: number;
  category: string;
  title: string;
  description: string;
  /** Optional per-language overrides; blank/absent falls back to title/description. */
  title_ar?: string | null;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  location: string;
  mode: string;
  duration: string;
  funding: string;
  /** Optional display price (exact, range, or with currency) for paid items. */
  price?: string;
  deadline: string | null;
  apply_url: string;
  /** Backend `OpportunityOut.organization` (id or null). */
  organization?: number | null;
  /** Denormalized organization name from the backend. */
  organization_name?: string;
  /** NGO/organization website, when the org has one (optional, never required). */
  organization_website?: string;
  is_active: boolean;
  /** "draft" | "published" | "hidden" | "archived" — management state. */
  status?: string;
  age: string;
  certificate: boolean;
  fields: string[];
  comment_count?: number;
  saved_count?: number;
  applied_count?: number;
  views?: number;
  apply_clicks?: number;
  /** Admin who created the opportunity (denormalized name from backend). */
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/** Mirrors the backend `StoryOut` ninja schema. */
export interface Story {
  id: number;
  opportunity_id: number;
  experience: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

/** Mirrors the backend `StoryListOut` ninja schema. */
export interface StoryList {
  stories: Story[];
  my_story: Story | null;
}

/** Mirrors the backend `SavedOut` ninja schema. */
export interface SavedOpportunity {
  id: number;
  user_id: number;
  opportunity_id: number;
}

/** Mirrors the backend `AppliedOut` ninja schema. */
export interface AppliedOpportunity {
  id: number;
  user_id: number;
  opportunity_id: number;
}
