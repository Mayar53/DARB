/** Mirrors the backend `CommentOut` ninja schema. */
export interface Comment {
  id: number;
  text: string;
  author_name: string;
  author_avatar: string;
  user_id: number;
  opportunity_id: number | null;
  story_id: number | null;
  /** Coarse author role exposed by the backend ("admin", "owner", "user", ...). */
  author_role: string;
  author_is_staff: boolean;
  /** Reply target — a top-level comment on the same opportunity. */
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

/** Payload for creating a comment — exactly one target. */
export interface CreateCommentInput {
  text: string;
  opportunity_id?: number;
  story_id?: number;
  parent_id?: number;
}
