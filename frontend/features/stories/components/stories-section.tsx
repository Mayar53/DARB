"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CommentList } from "@/features/comments";
import { useTranslation } from "@/hooks/use-translation";
import type { Story, StoryList } from "@/lib/types";

import { storiesApi } from "../api/stories.api";
import { ShareStoryForm } from "./share-story-form";

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Community stories feed for an opportunity page.
 * Shows all participants' stories plus the signed-in user's share/edit form.
 */
export function StoriesSection({ opportunityId }: { opportunityId: number }) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<StoryList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    storiesApi
      .listForOpportunity(opportunityId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load stories");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const replaceMyStory = (story: Story) =>
    setData((prev) => {
      if (!prev) return prev;
      const others = prev.stories.filter((s) => s.id !== story.id);
      return { stories: [...others, story], my_story: story };
    });

  const clearMyStory = () =>
    setData((prev) => {
      if (!prev?.my_story) return prev;
      return {
        stories: prev.stories.filter((s) => s.id !== prev.my_story!.id),
        my_story: null,
      };
    });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">{t("home.storiesTitle")}</h2>

      <ShareStoryForm
        opportunityId={opportunityId}
        myStory={data?.my_story ?? null}
        onSaved={replaceMyStory}
        onDeleted={clearMyStory}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !data || data.stories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("home.storiesEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.stories.map((story) => (
            <StoryItem key={story.id} story={story} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** A single story with a collapsible comments thread underneath. */
function StoryItem({ story, locale }: { story: Story; locale: string }) {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);

  return (
    <li className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-semibold text-foreground">{story.author_name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(story.created_at, locale)}
        </span>
      </div>
      <p className="whitespace-pre-line text-foreground/90">{story.experience}</p>

      <button
        type="button"
        onClick={() => setShowComments((v) => !v)}
        aria-expanded={showComments}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <MessageCircle className="size-3.5" />
        {t("comments.title")}
      </button>

      {showComments && (
        <div className="mt-3 border-t border-border pt-3">
          <CommentList target={{ storyId: story.id }} />
        </div>
      )}
    </li>
  );
}
