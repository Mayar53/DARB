"use client";

import { MessageCircle, Reply, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Comment } from "../types";

import { commentsApi } from "../api/comments.api";

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Small role badge — distinguishes admins/owner in the discussion. */
function RoleBadge({ comment }: { comment: Comment }) {
  const { t } = useTranslation();
  if (!comment.author_is_staff) return null;
  const isOwner = comment.author_role === "owner";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wider",
        isOwner
          ? "bg-secondary/20 text-secondary-foreground"
          : "bg-primary/10 text-primary",
      )}
    >
      {isOwner ? t("account.roleOwner") : t("account.roleAdmin")}
    </span>
  );
}

/**
 * Reusable comments list + form for an opportunity.
 *
 * One level of nesting: a top-level comment can have replies; a reply cannot
 * have replies. Replies appear indented under their parent.
 *
 * - Logged out: shows the comments and a login prompt instead of the form.
 * - Logged in: the main composer posts a top-level comment; each comment has a
 *   Reply button that opens an inline composer.
 * - Delete: the author can delete their own comment; staff (admin/owner) can
 *   moderate-delete any comment.
 */
export function CommentList({
  target,
}: {
  target: { opportunityId?: number; storyId?: number };
}) {
  const { t, locale } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const is_staff = !!user?.is_staff;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  // Reply state — which comment we're replying to + its draft text.
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  const isStoryTarget = target.storyId !== undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result =
          target.opportunityId !== undefined
            ? await commentsApi.listForOpportunity(target.opportunityId)
            : await commentsApi.listForStory(target.storyId!);
        if (!cancelled) setComments(result);
      } catch (error) {
        if (!cancelled)
          toast.error(error instanceof Error ? error.message : "Failed to load comments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target.opportunityId, target.storyId]);

  // Split into top-level + replies (only one level deep).
  const { topLevel, repliesByParent } = useMemo(() => {
    const repliesByParent = new Map<number, Comment[]>();
    const topLevel: Comment[] = [];
    for (const c of comments) {
      if (c.parent_id != null) {
        const list = repliesByParent.get(c.parent_id) ?? [];
        list.push(c);
        repliesByParent.set(c.parent_id, list);
      } else {
        topLevel.push(c);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  const submitTop = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned) {
      toast.error(t("comments.emptyError"));
      return;
    }
    if (cleaned.length > 500) {
      toast.error(t("comments.tooLong"));
      return;
    }
    setSaving(true);
    try {
      const comment = await commentsApi.create({
        text: cleaned,
        ...(target.opportunityId !== undefined
          ? { opportunity_id: target.opportunityId }
          : { story_id: target.storyId }),
      });
      setComments((prev) => [comment, ...prev]);
      setText("");
      toast.success(t("comments.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (event: React.FormEvent, parent: Comment) => {
    event.preventDefault();
    const cleaned = replyText.trim();
    if (!cleaned) {
      toast.error(t("comments.emptyError"));
      return;
    }
    if (cleaned.length > 500) {
      toast.error(t("comments.tooLong"));
      return;
    }
    setSavingReply(true);
    try {
      const comment = await commentsApi.create({
        text: cleaned,
        ...(target.opportunityId !== undefined
          ? { opportunity_id: target.opportunityId }
          : { story_id: target.storyId }),
        parent_id: parent.id,
      });
      setComments((prev) => [comment, ...prev]);
      setReplyText("");
      setReplyingTo(null);
      toast.success(t("comments.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    } finally {
      setSavingReply(false);
    }
  };

  const remove = async (comment: Comment) => {
    if (!window.confirm(t("comments.deleteConfirm"))) return;
    try {
      await commentsApi.remove(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      toast.success(t("admin.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const canDelete = (comment: Comment) =>
    is_staff || comment.user_id === user?.id;

  const authorRow = (comment: Comment, sizeClass = "size-7 text-sm") => (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar
        user={{ nickname: comment.author_name, avatar: comment.author_avatar } as never}
        className={sizeClass}
      />
      <Link
        href={`/users/${comment.user_id}`}
        className="truncate font-semibold text-foreground hover:text-primary"
      >
        {comment.author_name}
      </Link>
      <RoleBadge comment={comment} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Compact count header */}
      <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <MessageCircle className="size-4" />
        {comments.length} {comments.length === 1 ? t("comments.countOne") : t("comments.countMany")}
      </div>

      {!isAuthenticated ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          {t("comments.loginPrompt")}{" "}
          <Link href={ROUTES.login} className="font-semibold text-primary hover:underline">
            {t("auth.toLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submitTop} className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t("comments.placeholder")}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">{text.length}/500</span>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? t("common.loading") : t("comments.submit")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("comments.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {topLevel.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            const isReplying = replyingTo === comment.id;
            return (
              <li key={comment.id} className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    {authorRow(comment)}
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at, locale)}
                      </span>
                      {canDelete(comment) && (
                        <button
                          type="button"
                          onClick={() => void remove(comment)}
                          title={t("comments.delete")}
                          aria-label={t("comments.delete")}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-foreground/90">{comment.text}</p>

                  {isAuthenticated && !isStoryTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isReplying) {
                          setReplyingTo(null);
                          setReplyText("");
                        } else {
                          setReplyingTo(comment.id);
                          setReplyText("");
                        }
                      }}
                      className="mt-1 inline-flex w-fit items-center gap-1 rounded-full text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                    >
                      {isReplying ? (
                        <>
                          <X className="size-3.5" />
                          {t("admin.cancel")}
                        </>
                      ) : (
                        <>
                          <Reply className="size-3.5 rtl:-scale-x-100" />
                          {t("comments.reply")}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Inline reply composer */}
                {isReplying && (
                  <form
                    onSubmit={(e) => void submitReply(e, comment)}
                    className="ms-3 flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:ms-6"
                  >
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      autoFocus
                      placeholder={`${t("comments.replyPlaceholder")} ${comment.author_name}…`}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {replyText.length}/500
                      </span>
                      <button
                        type="submit"
                        disabled={savingReply}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {savingReply ? t("common.loading") : t("comments.replySubmit")}
                      </button>
                    </div>
                  </form>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                  <ul className="ms-3 flex flex-col gap-2 border-s-2 border-border/60 ps-3 sm:ms-6">
                    {replies.map((reply) => (
                      <li
                        key={reply.id}
                        className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          {authorRow(reply, "size-6 text-xs")}
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(reply.created_at, locale)}
                            </span>
                            {canDelete(reply) && (
                              <button
                                type="button"
                                onClick={() => void remove(reply)}
                                title={t("comments.delete")}
                                aria-label={t("comments.delete")}
                                className="text-muted-foreground transition-colors hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="whitespace-pre-line text-foreground/90">{reply.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
