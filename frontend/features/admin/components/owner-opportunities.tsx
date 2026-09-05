"use client";

import { Banknote, Building2, CalendarDays, Pencil, Plus, Share2, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { categoryInfo, fieldInfo, fundingLabelKey, fundingShowsPrice } from "@/lib/constants";

import { opportunitiesApi } from "@/features/opportunities/api/opportunities.api";
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form";
import { ShareDialog } from "@/features/social/components/share-dialog";
import type { Opportunity } from "@/lib/types";

/** Derive the management status bucket for an opportunity. */
function statusBucket(o: Opportunity): "published" | "draft" | "hidden" | "past" {
  const status = o.status ?? (o.is_active ? "published" : "hidden");
  if (status === "draft") return "draft";
  if (status === "hidden") return "hidden";
  if (status === "archived") return "past";
  // Published: past if the deadline has passed.
  if (o.deadline) {
    const deadline = new Date(`${o.deadline}T23:59:59`);
    if (deadline.getTime() < Date.now()) return "past";
  }
  return "published";
}

/** Owner: all opportunities split by status, with full CRUD + status actions. */
export function OwnerOpportunities() {
  const { t } = useTranslation();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sharing, setSharing] = useState<Opportunity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOpportunities(await opportunitiesApi.listAll());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    opportunitiesApi
      .listAll()
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

  const buckets: { key: "published" | "draft" | "hidden" | "past"; title: string }[] = [
    { key: "published", title: t("admin.oppStatusPublished") },
    { key: "draft", title: t("admin.oppStatusDraft") },
    { key: "hidden", title: t("admin.oppStatusHidden") },
    { key: "past", title: t("admin.oppStatusPast") },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t("admin.oppSectionTitle")}</CardTitle>
          <CardDescription>{t("admin.oppSectionSubtitle")}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          {t("admin.oppNew")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
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
          buckets.map((bucket) => {
            const items = opportunities
              .filter((o) => statusBucket(o) === bucket.key)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return (
              <section key={bucket.key} className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {bucket.title}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                    {items.length}
                  </span>
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.oppNone")}</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((opp) => {
                      const cat = categoryInfo(opp.category);
                      const isPast = bucket.key === "past";
                      return (
                        <li
                          key={opp.id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
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
                              {isPast && (
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
                            {/* NGO + posted-by + deadline + funding/price */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {opp.organization_name && (
                                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                                  <Building2 className="size-3.5 opacity-60" />
                                  {opp.organization_name}
                                </span>
                              )}
                              {opp.created_by_name && (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="size-3.5 opacity-60" />
                                  {opp.created_by_name}
                                </span>
                              )}
                              {opp.deadline && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="size-3.5 opacity-60" />
                                  {new Date(`${opp.deadline}T00:00:00`).toLocaleDateString()}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Banknote className="size-3.5 opacity-60" />
                                {fundingShowsPrice(opp.funding) && opp.price?.trim()
                                  ? `${t(fundingLabelKey(opp.funding))} · ${opp.price.trim()}`
                                  : t(fundingLabelKey(opp.funding))}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            {bucket.key !== "published" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void setStatus(opp, "published")}
                              >
                                {t("admin.oppPublish")}
                              </Button>
                            )}
                            {bucket.key !== "hidden" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void setStatus(opp, "hidden")}
                              >
                                {t("admin.oppHide")}
                              </Button>
                            )}
                            {bucket.key !== "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void setStatus(opp, "draft")}
                              >
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
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDelete(opp)}
                            >
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
      </CardContent>
      {sharing && (
        <ShareDialog
          opportunity={sharing}
          open
          onOpenChange={(open) => {
            if (!open) setSharing(null);
          }}
        />
      )}
    </Card>
  );
}
