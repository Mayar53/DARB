export type { Story, StoryList } from "@/lib/types";

/** Create payload — mirrors the backend `StoryIn` schema. */
export interface CreateStoryInput {
  opportunity_id: number;
  experience: string;
}

/** Update payload — mirrors the backend `StoryUpdateIn` schema. */
export interface UpdateStoryInput {
  experience: string;
}
