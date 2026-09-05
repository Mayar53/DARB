"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIES,
  FUNDING,
  MODES,
  SUBJECT_TREE,
  categoryInfo,
} from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { opportunitiesApi } from "../api/opportunities.api";
import type { Opportunity } from "../types";

const MODE_LABELS: Record<(typeof MODES)[number], MessageKey> = {
  online: "home.modeOnline",
  "in-person": "home.modeInPerson",
  hybrid: "home.modeHybrid",
};

const FUNDING_LABELS: Record<(typeof FUNDING)[number], MessageKey> = {
  paid: "home.fundingPaid",
  free: "home.fundingFree",
  "fully-funded": "home.fundingFullyFunded",
  "partially-funded": "home.fundingPartiallyFunded",
};

const AGE_OPTIONS = ["all", "13-15", "15-18", "+18", "16-18", "19-21", "22-25", "26+"] as const;
/** Sentinel value for the "custom range" option in the age selector. */
const AGE_CUSTOM = "custom";

interface FormState {
  category: string;
  title: string;
  description: string;
  /** Per-language overrides — blank means "use the base field for that locale". */
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  location: string;
  mode: string;
  duration: string;
  funding: string;
  price: string;
  deadline: string;
  apply_url: string;
  organization: string;
  organization_website: string;
  is_active: boolean;
  age: string;
  certificate: boolean;
  fields: string[];
  /** UI-only: whether the admin is entering the field in both languages. */
  dualTitle: boolean;
  dualDescription: boolean;
}

const EMPTY: FormState = {
  category: "volunteer",
  title: "",
  description: "",
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  location: "",
  mode: "online",
  duration: "",
  funding: "free",
  price: "",
  deadline: "",
  apply_url: "",
  organization: "",
  organization_website: "",
  is_active: true,
  age: "all",
  certificate: false,
  fields: [],
  dualTitle: false,
  dualDescription: false,
};

function fromOpportunity(o: Opportunity): FormState {
  // Dual mode is offered when a per-language override exists. The Arabic field
  // falls back to the base text (base is the Arabic/primary content in Darb).
  const titleAr = o.title_ar ?? o.title ?? "";
  const titleEn = o.title_en ?? "";
  const descriptionAr = o.description_ar ?? o.description ?? "";
  const descriptionEn = o.description_en ?? "";
  return {
    category: o.category,
    title: o.title,
    description: o.description,
    title_ar: titleAr,
    title_en: titleEn,
    description_ar: descriptionAr,
    description_en: descriptionEn,
    location: o.location,
    mode: o.mode,
    duration: o.duration,
    funding: o.funding,
    price: o.price ?? "",
    deadline: o.deadline ?? "",
    apply_url: o.apply_url,
    organization: o.organization_name ?? "",
    organization_website: o.organization_website ?? "",
    is_active: o.is_active,
    age: o.age,
    certificate: o.certificate,
    fields: o.fields ?? [],
    dualTitle: Boolean(o.title_ar || o.title_en),
    dualDescription: Boolean(o.description_ar || o.description_en),
  };
}

/** Small segmented control: single-language vs manual Arabic + English entry. */
function LanguageModeToggle({
  dual,
  onChange,
}: {
  dual: boolean;
  onChange: (dual: boolean) => void;
}) {
  const { t } = useTranslation();
  const option = (active: boolean, label: string, value: boolean) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {option(!dual, t("admin.form.langOne"), false)}
      {option(dual, t("admin.form.langBoth"), true)}
    </div>
  );
}

/** Admin card form — create or edit an opportunity (draft card styling). */
export function OpportunityForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Opportunity;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const editing = Boolean(initial);
  const [form, setForm] = useState<FormState>(initial ? fromOpportunity(initial) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      // In dual-language mode the Arabic text is the base (required, fallback for
      // both locales) and English is stored as the per-language override; the
      // explicit Arabic override is redundant (base already is Arabic).
      const titleBase = form.dualTitle ? form.title_ar : form.title;
      const titleAr = form.dualTitle ? "" : form.title_ar;
      const descriptionBase = form.dualDescription ? form.description_ar : form.description;
      const descriptionAr = form.dualDescription ? "" : form.description_ar;
      const payload = {
        category: form.category,
        title: titleBase,
        description: descriptionBase,
        title_ar: titleAr.trim() || null,
        title_en: form.title_en.trim() || null,
        description_ar: descriptionAr.trim() || null,
        description_en: form.description_en.trim() || null,
        location: form.location,
        mode: form.mode,
        duration: form.duration,
        funding: form.funding,
        price: form.price.trim(),
        deadline: form.deadline || null,
        apply_url: form.apply_url,
        organization: form.organization,
        organization_website: form.organization_website,
        is_active: form.is_active,
        age: form.age,
        certificate: form.certificate,
        fields: form.fields,
      };
      if (editing && initial) {
        await opportunitiesApi.update(initial.id, payload);
        toast.success(t("admin.updated"));
      } else {
        await opportunitiesApi.create(payload);
        toast.success(t("admin.created"));
      }
      setForm(EMPTY);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-5"
    >
      <h3 className="font-heading text-xl font-bold text-foreground">
        {editing ? t("admin.edit") : t("admin.new")}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title — single (base/fallback) or manual Arabic + English. */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="opp-title">{t("admin.form.title")}</Label>
            <LanguageModeToggle dual={form.dualTitle} onChange={(v) => set("dualTitle", v)} />
          </div>
          {form.dualTitle ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="opp-title-ar">{t("admin.form.langArabic")}</Label>
                <Input
                  id="opp-title-ar"
                  required
                  value={form.title_ar}
                  onChange={(e) => set("title_ar", e.target.value)}
                  placeholder={t("admin.form.langArabicPh")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opp-title-en">{t("admin.form.langEnglish")}</Label>
                <Input
                  id="opp-title-en"
                  required
                  dir="ltr"
                  value={form.title_en}
                  onChange={(e) => set("title_en", e.target.value)}
                  placeholder={t("admin.form.langEnglishPh")}
                />
              </div>
            </div>
          ) : (
            <>
              <Input
                id="opp-title"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("admin.form.titlePh")}
              />
              <p className="text-xs text-muted-foreground">{t("admin.form.langOneHint")}</p>
            </>
          )}
        </div>

        {/* Description — single (base/fallback) or manual Arabic + English. */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="opp-desc">{t("admin.form.description")}</Label>
            <LanguageModeToggle
              dual={form.dualDescription}
              onChange={(v) => set("dualDescription", v)}
            />
          </div>
          {form.dualDescription ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="opp-desc-ar">{t("admin.form.langArabic")}</Label>
                <textarea
                  id="opp-desc-ar"
                  required
                  rows={3}
                  value={form.description_ar}
                  onChange={(e) => set("description_ar", e.target.value)}
                  placeholder={t("admin.form.langArabicPh")}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opp-desc-en">{t("admin.form.langEnglish")}</Label>
                <textarea
                  id="opp-desc-en"
                  required
                  dir="ltr"
                  rows={3}
                  value={form.description_en}
                  onChange={(e) => set("description_en", e.target.value)}
                  placeholder={t("admin.form.langEnglishPh")}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <>
              <textarea
                id="opp-desc"
                required
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={t("admin.form.descriptionPh")}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">{t("admin.form.langOneHint")}</p>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("admin.form.category")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => set("category", cat.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  form.category === cat.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary",
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: categoryInfo(cat.key).color }}
                />
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("admin.form.fields")}</Label>
          <div className="flex flex-col gap-2">
            {/* Broad parent groups — click to select, caret to expand. */}
            {SUBJECT_TREE.map((group) => {
              const groupSelected = form.fields.includes(group.key);
              const open = openGroups.has(group.key);
              return (
                <div key={group.key} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "fields",
                          groupSelected
                            ? form.fields.filter((f) => f !== group.key)
                            : [...form.fields, group.key],
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                        groupSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary",
                      )}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {t(group.labelKey)}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={open}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {t("admin.form.fieldsExpand")}
                      <span className={cn("transition-transform", open && "rotate-180")} aria-hidden>
                        ▾
                      </span>
                    </button>
                  </div>
                  {open && (
                    <div className="flex flex-col gap-2 border-s-2 border-dashed ps-3">
                      {group.children.map((child) => {
                        const selected = form.fields.includes(child.key);
                        const hasDeeper = child.children && child.children.length > 0;
                        const deeperOpen = openGroups.has(`${group.key}:${child.key}`);
                        return (
                          <div key={child.key} className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  set(
                                    "fields",
                                    selected
                                      ? form.fields.filter((f) => f !== child.key)
                                      : [...form.fields, child.key],
                                  )
                                }
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary",
                                )}
                              >
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: child.color }}
                                />
                                {t(child.labelKey)}
                              </button>
                              {hasDeeper && (
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(`${group.key}:${child.key}`)}
                                  aria-expanded={deeperOpen}
                                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                >
                                  {t("admin.form.fieldsExpand")}
                                  <span
                                    className={cn("transition-transform", deeperOpen && "rotate-180")}
                                    aria-hidden
                                  >
                                    ▾
                                  </span>
                                </button>
                              )}
                            </div>
                            {hasDeeper && deeperOpen && (
                              <div className="flex flex-wrap gap-1.5 border-s-2 border-dashed ps-3">
                                {child.children!.map((leaf) => {
                                  const leafSelected = form.fields.includes(leaf.key);
                                  return (
                                    <button
                                      key={leaf.key}
                                      type="button"
                                      onClick={() =>
                                        set(
                                          "fields",
                                          leafSelected
                                            ? form.fields.filter((f) => f !== leaf.key)
                                            : [...form.fields, leaf.key],
                                        )
                                      }
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                                        leafSelected
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-border bg-background text-muted-foreground hover:border-primary",
                                      )}
                                    >
                                      <span
                                        className="size-2 rounded-full"
                                        style={{ backgroundColor: leaf.color }}
                                      />
                                      {t(leaf.labelKey)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-location">{t("admin.form.location")}</Label>
          <Input
            id="opp-location"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder={t("admin.form.locationPh")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-mode">{t("admin.form.mode")}</Label>
          <select
            id="opp-mode"
            value={form.mode}
            onChange={(e) => set("mode", e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {t(MODE_LABELS[m])}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-duration">{t("admin.form.duration")}</Label>
          <Input
            id="opp-duration"
            value={form.duration}
            onChange={(e) => set("duration", e.target.value)}
            placeholder={t("admin.form.durationPh")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-funding">{t("admin.form.funding")}</Label>
          <select
            id="opp-funding"
            value={form.funding}
            onChange={(e) => set("funding", e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {FUNDING.map((f) => (
              <option key={f} value={f}>
                {t(FUNDING_LABELS[f])}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-price">{t("admin.form.price")}</Label>
          <Input
            id="opp-price"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder={t("admin.form.pricePh")}
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-age">{t("home.ageLabel")}</Label>
          <select
            id="opp-age"
            value={AGE_OPTIONS.includes(form.age as (typeof AGE_OPTIONS)[number]) ? form.age : AGE_CUSTOM}
            onChange={(e) => {
              const value = e.target.value;
              if (value === AGE_CUSTOM) {
                // Keep whatever free-text range is already set (or a sensible default).
                if (AGE_OPTIONS.includes(form.age as (typeof AGE_OPTIONS)[number])) set("age", "");
              } else {
                set("age", value);
              }
            }}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? t("home.ageAll") : a}
              </option>
            ))}
            <option value={AGE_CUSTOM}>{t("admin.form.ageCustom")}</option>
          </select>
          {form.age !== "all" && !AGE_OPTIONS.includes(form.age as (typeof AGE_OPTIONS)[number]) && (
            <Input
              aria-label={t("admin.form.ageCustom")}
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder={t("admin.form.ageCustomPh")}
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-deadline">{t("admin.form.deadline")}</Label>
          <Input
            id="opp-deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-url">
            {t("admin.form.applyUrl")}{" "}
            <span className="font-normal text-muted-foreground">({t("admin.form.optional")})</span>
          </Label>
          <Input
            id="opp-url"
            type="text"
            inputMode="url"
            dir="ltr"
            value={form.apply_url}
            onChange={(e) => set("apply_url", e.target.value)}
            placeholder={t("admin.form.applyUrlPh")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-org">
            {t("admin.form.organization")}{" "}
            <span className="font-normal text-muted-foreground">({t("admin.form.optional")})</span>
          </Label>
          <Input
            id="opp-org"
            value={form.organization}
            onChange={(e) => set("organization", e.target.value)}
            placeholder={t("admin.form.organizationPh")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-org-website">
            {t("admin.form.ngoWebsite")}{" "}
            <span className="font-normal text-muted-foreground">({t("admin.form.optional")})</span>
          </Label>
          <Input
            id="opp-org-website"
            type="text"
            inputMode="url"
            dir="ltr"
            value={form.organization_website}
            onChange={(e) => set("organization_website", e.target.value)}
            placeholder={t("admin.form.ngoWebsitePh")}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-2">
          <input
            type="checkbox"
            checked={form.certificate}
            onChange={(e) => set("certificate", e.target.checked)}
            className="size-4 accent-primary"
          />
          {t("home.certificateOffered")}
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="size-4 accent-primary"
          />
          {t("admin.form.active")}
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("admin.saveLoading") : editing ? t("admin.update") : t("admin.save")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("admin.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
