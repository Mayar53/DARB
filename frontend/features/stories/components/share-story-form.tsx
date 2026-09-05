"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";

import { storiesApi } from "../api/stories.api";
import type { Story } from "../types";

/**
 * Share / edit form for the signed-in user's participation story.
 * - Signed out: shows a login prompt instead of the form.
 * - Signed in, no story yet: a simple textarea + submit.
 * - Signed in, has a story: pre-fills and switches to Edit mode.
 */
export function ShareStoryForm({
  opportunityId,
  myStory,
  onSaved,
  onDeleted,
}: {
  opportunityId: number;
  myStory: Story | null;
  onSaved: (story: Story) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [experience, setExperience] = useState(myStory?.experience ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (myStory && !editing) {
        // First click just reveals the edit state with the current text.
        setEditing(true);
        return;
      }
      const story =
        myStory && editing
          ? await storiesApi.update(myStory.id, experience)
          : await storiesApi.create(opportunityId, experience);
      toast.success(editing ? t("admin.updated") : t("home.storiesSubmit"));
      setEditing(false);
      onSaved(story);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!myStory) return;
    if (!window.confirm(t("home.storiesDeleteConfirm"))) return;
    setDeleting(true);
    try {
      await storiesApi.remove(myStory.id);
      toast.success(t("admin.deleted"));
      setExperience("");
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("home.storiesLoginPrompt")}{" "}
        <Link href={ROUTES.login} className="font-semibold text-primary hover:underline">
          {t("auth.toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <label className="text-sm font-semibold text-foreground">
        {myStory && !editing ? t("home.storiesMy") : t("home.storiesShare")}
      </label>

      {myStory && !editing ? (
        <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm text-foreground">
          {myStory.experience}
        </p>
      ) : (
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          required
          rows={4}
          maxLength={2000}
          placeholder={t("home.storiesSharePh")}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!myStory ? (
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? t("common.loading") : t("home.storiesSubmit")}
          </Button>
        ) : editing ? (
          <>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("common.loading") : t("home.storiesUpdate")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              {t("home.storiesCancel")}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              {t("home.storiesEdit")}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? t("common.loading") : t("home.storiesDelete")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
