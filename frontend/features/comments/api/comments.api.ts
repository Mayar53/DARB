import { api } from "@/lib/api-client";

import type { Comment, CreateCommentInput } from "../types";

/** All comments endpoints in one place — every call goes through the api client. */
export const commentsApi = {
  /** Public: all comments on an opportunity. */
  listForOpportunity: (opportunityId: number) =>
    api.get<Comment[]>(`/comments/opportunity/${opportunityId}`, { auth: false }),
  /** Public: all comments on a story. */
  listForStory: (storyId: number) =>
    api.get<Comment[]>(`/comments/story/${storyId}`, { auth: false }),
  /** Auth required. */
  create: (data: CreateCommentInput) => api.post<Comment>("/comments", data),
  /** Auth required — author or staff/owner. */
  remove: (commentId: number) => api.delete<void>(`/comments/${commentId}`),
};
