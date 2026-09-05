import { api } from "@/lib/api-client";
import type { Story, StoryList } from "@/lib/types";

/** All stories endpoints in one place — every call goes through the api client. */
export const storiesApi = {
  /** Public: all stories for an opportunity + the caller's own (if signed in). */
  listForOpportunity: (opportunityId: number) =>
    api.get<StoryList>(`/stories/opportunity/${opportunityId}`, { auth: false }),
  /** Auth required: the signed-in user's own stories. */
  listMine: () => api.get<Story[]>("/stories/mine"),
  create: (opportunityId: number, experience: string) =>
    api.post<Story>("/stories", { opportunity_id: opportunityId, experience }),
  update: (storyId: number, experience: string) =>
    api.put<Story>(`/stories/${storyId}`, { experience }),
  remove: (storyId: number) => api.delete<void>(`/stories/${storyId}`),
};
