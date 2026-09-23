"use client";

import { Building2, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import type { Opportunity, Organization } from "@/lib/types";

import { adminApi } from "../api/admin.api";

/**
 * NGO management for the owner: every organization with how many opportunities
 * it holds, plus an inline form to fix its name, website or description.
 *
 * Organizations are created from approved org applications (or by naming one on
 * an opportunity) and had no editing path anywhere before this — a typo in a
 * name could never be corrected.
 */
export function OwnerOrganizations({
  organizations,
  opportunities,
  onChanged,
}: {
  organizations: Organization[];
  opportunities: Opportunity[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", website: "", description: "" });
  const [saving, setSaving] = useState(false);

  /** Opportunities per organization (the link is the org id on each row). */
  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of opportunities) {
      if (o.organization == null) continue;
      map.set(o.organization, (map.get(o.organization) ?? 0) + 1);
    }
    return map;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLocaleLowerCase().includes(q) ||
        org.website.toLocaleLowerCase().includes(q) ||
        org.description.toLocaleLowerCase().includes(q),
    );
  }, [organizations, query]);

  const startEdit = (org: Organization) => {
    setEditingId(org.id);
    setDraft({ name: org.name, website: org.website, description: org.description });
  };

  const save = async (org: Organization) => {
    if (saving) return;
    setSaving(true);
    try {
      await adminApi.updateOrganization(org.id, draft);
      toast.success(t("admin.orgSaved"));
      setEditingId(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.orgSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          {t("admin.orgsTitle")}
        </CardTitle>
        <CardDescription>{t("admin.orgsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.orgsSearch")}
            aria-label={t("admin.orgsSearch")}
            className="ps-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {organizations.length === 0 ? t("admin.orgsEmpty") : t("admin.orgsNoMatch")}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((org) => {
              const isEditing = editingId === org.id;
              const count = counts.get(org.id) ?? 0;
              return (
                <li key={org.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1 text-sm">
                      <span className="font-semibold text-foreground">{org.name}</span>
                      {org.website ? (
                        <a
                          href={org.website}
                          target="_blank"
                          rel="noreferrer"
                          dir="ltr"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {org.website}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("admin.orgNoWebsite")}
                        </span>
                      )}
                      {org.description ? (
                        <p className="max-w-2xl text-muted-foreground">{org.description}</p>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {count} {count === 1 ? t("admin.orgOppOne") : t("admin.orgOppMany")}
                      </span>
                    </div>
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(org)}>
                        <Pencil className="size-3.5" />
                        {t("admin.orgEdit")}
                      </Button>
                    )}
                  </div>

                  {isEditing && (
                    <form
                      className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save(org);
                      }}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={`org-name-${org.id}`}>{t("admin.orgName")}</Label>
                        <Input
                          id={`org-name-${org.id}`}
                          required
                          maxLength={255}
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((d) => ({ ...d, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`org-website-${org.id}`}>{t("admin.orgWebsite")}</Label>
                        <Input
                          id={`org-website-${org.id}`}
                          dir="ltr"
                          maxLength={500}
                          placeholder={t("admin.orgWebsitePh")}
                          value={draft.website}
                          onChange={(event) =>
                            setDraft((d) => ({ ...d, website: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`org-desc-${org.id}`}>{t("admin.orgDescription")}</Label>
                        <textarea
                          id={`org-desc-${org.id}`}
                          rows={3}
                          maxLength={2000}
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((d) => ({ ...d, description: event.target.value }))
                          }
                          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Button type="submit" size="sm" disabled={saving || !draft.name.trim()}>
                          {saving ? t("admin.saveLoading") : t("common.save")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          {t("admin.cancel")}
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
