"use client";

import { Eye, MessageCircle, MousePointerClick, Pencil, Plus, Save, Send, Share2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BackHomeNav } from "@/components/shared/back-home-nav";
import { categoryInfo, fieldInfo } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import type { Opportunity } from "@/lib/types";

import { ShareDialog } from "@/features/social/components/share-dialog";
import { opportunitiesApi } from "../api/opportunities.api";
import { OpportunityForm } from "./opportunity-form";

/** Management status bucket for an opportunity. */
function statusBucket(o: Opportunity): "published" | "draft" | "hidden" | "past" | "upcoming" {
  const status = o.status ?? (o.is_active ? "published" : "hidden");
  if (status === "draft") return "draft";
  if (status === "hidden") return "hidden";
  if (status === "archived") return "past";
  // Published: past if the deadline passed; upcoming if it's in the future.
  if (o.deadline) {
    const deadline = new Date(`${o.deadline}T23:59:59`);
    if (deadline.getTime() < Date.now()) return "past";
    return "upcoming";
  }
  return "published";
}

const BUCKET_KEYS = ["published", "draft", "hidden", "past", "upcoming"] as const;

/** A compact stat chip for one opportunity. */
function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
    >
      <Icon className="size-3" />
      {value}
    </span>
  );
}

/**
 * Admin dashboard — each approved admin sees ONLY their own opportunities
 * (backed by GET /opportunities/mine), split by status, with real engagement
 * statistics (views, clicks, applications, saves, comments). The backend
 * enforces ownership on every create/edit/status/delete action.
 */
export function AdminOpportunities() {
  const { t } = useTranslation();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sharing, setSharing] = useState<Opportunity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOpportunities(await opportunitiesApi.listMine());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    opportunitiesApi
      .listMine()
      .then((list) => {
        if (!cancelled) setOpportunities(list);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setStatus = async (opp: Opportunity, status: string) => {
    try {
      await opportunitiesApi.update(opp.id, { status });
      toast.success(t("admin.updated"));
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async (opp: Opportunity) => {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    try {
      await opportunitiesApi.remove(opp.id);
      toast.success(t("admin.deleted"));
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // Buckets with real counts.
  const buckets = useMemo(() => {
    const byKey: Record<(typeof BUCKET_KEYS)[number], Opportunity[]> = {
      published: [],
      draft: [],
      hidden: [],
      past: [],
      upcoming: [],
    };
    for (const o of opportunities) byKey[statusBucket(o)].push(o);
    for (const key of BUCKET_KEYS) {
      byKey[key].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return byKey;
  }, [opportunities]);

  // Totals across all the admin's opportunities.
  const totals = useMemo(
    () => ({
      views: opportunities.reduce((s, o) => s + (o.views ?? 0), 0),
      clicks: opportunities.reduce((s, o) => s + (o.apply_clicks ?? 0), 0),
      applied: opportunities.reduce((s, o) => s + (o.applied_count ?? 0), 0),
      saved: opportunities.reduce((s, o) => s + (o.saved_count ?? 0), 0),
      comments: opportunities.reduce((s, o) => s + (o.comment_count ?? 0), 0),
    }),
    [opportunities],
  );

  const bucketTitles: Record<(typeof BUCKET_KEYS)[number], string> = {
    published: t("admin.oppStatusPublished"),
    draft: t("admin.oppStatusDraft"),
    hidden: t("admin.oppStatusHidden"),
    past: t("admin.oppStatusPast"),
    upcoming: t("admin.oppStatusUpcoming"),
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          <BackHomeNav />
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {t("admin.myDashboardTitle")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("admin.myDashboardSubtitle")}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          {t("admin.new")}
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <TotalCard icon={Eye} label={t("admin.statViews")} value={totals.views} />
        <TotalCard icon={MousePointerClick} label={t("admin.statClicks")} value={totals.clicks} />
        <TotalCard icon={Send} label={t("admin.statApplied")} value={totals.applied} />
        <TotalCard icon={Save} label={t("admin.statSaved")} value={totals.saved} />
        <TotalCard icon={MessageCircle} label={t("admin.statComments")} value={totals.comments} />
      </div>

      {showForm && (
        <OpportunityForm
          initial={editing ?? undefined}
          onSaved={() => {
            setEditing(null);
            setShowForm(false);
            void load();
          }}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        BUCKET_KEYS.map((key) => {
          const items = buckets[key];
          return (
            <section key={key} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {bucketTitles[key]}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.oppNone")}</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((opp) => {
                    const cat = categoryInfo(opp.category);
                    return (
                      <li
                        key={opp.id}
                        className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {t(cat.labelKey)}
                            </span>
                            {opp.fields?.slice(0, 3).map((key) => {
                              const field = fieldInfo(key);
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                                >
                                  <span
                                    className="size-1.5 rounded-full"
                                    style={{ backgroundColor: field.color }}
                                  />
                                  {t(field.labelKey)}
                                </span>
                              );
                            })}
                            {key === "past" && (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                                {t("admin.oppExpired")}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground">{opp.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {opp.location}
                            {opp.location && opp.duration ? " · " : ""}
                            {opp.duration}
                          </div>
                          {/* Per-opportunity engagement stats */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatChip icon={Eye} label={t("admin.statViews")} value={opp.views ?? 0} />
                            <StatChip icon={MousePointerClick} label={t("admin.statClicks")} value={opp.apply_clicks ?? 0} />
                            <StatChip icon={Send} label={t("admin.statApplied")} value={opp.applied_count ?? 0} />
                            <StatChip icon={Save} label={t("admin.statSaved")} value={opp.saved_count ?? 0} />
                            <StatChip icon={MessageCircle} label={t("admin.statComments")} value={opp.comment_count ?? 0} />
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {key !== "published" && (
                            <Button size="sm" variant="outline" onClick={() => void setStatus(opp, "published")}>
                              {t("admin.oppPublish")}
                            </Button>
                          )}
                          {key !== "hidden" && (
                            <Button size="sm" variant="outline" onClick={() => void setStatus(opp, "hidden")}>
                              {t("admin.oppHide")}
                            </Button>
                          )}
                          {key !== "draft" && (
                            <Button size="sm" variant="outline" onClick={() => void setStatus(opp, "draft")}>
                              {t("admin.oppDraft")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(opp);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                            {t("admin.editBtn")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSharing(opp)}
                            title={t("share.title")}
                          >
                            <Share2 className="size-3.5" />
                            {t("share.openPreview")}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void handleDelete(opp)}>
                            <Trash2 className="size-3.5" />
                            {t("admin.delete")}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
      {sharing && (
        <ShareDialog
          opportunity={sharing}
          open
          onOpenChange={(open) => {
            if (!open) setSharing(null);
          }}
        />
      )}
    </div>
  );
}

function TotalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
