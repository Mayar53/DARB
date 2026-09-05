"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { applyApi } from "../api/apply.api";
import type { AdminApplication } from "../types";

/**
 * Apply to become an admin.
 *
 * Two flows:
 * - Researcher / opportunity admin ("admin") — people helping Darb research.
 * - Organization admin ("org") — NGOs/organizations that publish directly.
 *
 * When signed in, the email/name are prefilled from the account and the
 * application is linked to it — no second account is ever created. If the
 * user already has an application, its status is shown instead of a duplicate.
 * Website is optional in both flows.
 */
export function AdminApplyForm() {
  const { user, hydrated } = useAuth();

  // Wait for the persisted session to rehydrate before mounting the form, so
  // the account prefill always sees the signed-in user (never a null capture
  // on first paint). Public visitors get the form immediately once hydration
  // settles — with no user it simply stays blank/prefill-free.
  if (!hydrated) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          …
        </CardContent>
      </Card>
    );
  }

  return <ApplyFormBody key={user?.id ?? "anonymous"} user={user} />;
}

/** The actual form + status card — mounted after session hydration. */
function ApplyFormBody({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [requestType, setRequestType] = useState<"admin" | "org">("admin");
  // Prefill once from the signed-in account.
  const [email, setEmail] = useState(() => user?.email ?? "");
  const [fullName, setFullName] = useState(() => user?.full_name ?? "");
  const [organization, setOrganization] = useState("");
  const [website, setWebsite] = useState("");
  const [position, setPosition] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<AdminApplication | null | undefined>(undefined);

  // Load any existing application for the signed-in account (async only).
  useEffect(() => {
    if (!user || user.is_staff) return;
    let cancelled = false;
    applyApi
      .myApplication()
      .then((app) => {
        if (!cancelled) setExisting(app);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Guard against double-submits (Enter + click while a request is in flight).
    if (submitting) return;
    if (requestType === "org" && !organization.trim()) {
      toast.error(t("adminApply.organizationRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const app = await applyApi.apply({
        email,
        full_name: fullName,
        organization,
        website,
        position,
        reason,
        request_type: requestType,
      });
      // Only treat it as success when the backend actually returned the saved
      // application (2xx with a body) — never guess.
      if (!app || !app.id) {
        throw new Error(t("adminApply.error"));
      }
      setExisting(app);
      toast.success(t("adminApply.success"));
    } catch (error) {
      // Show the required generic message; when the backend returned a useful
      // reason (e.g. "no account for this email"), surface it as the detail so
      // genuine validation/account errors are never masked.
      const detail =
        error instanceof Error && error.message && !/failed to fetch|load failed|networkerror/i.test(error.message)
          ? error.message
          : null;
      if (detail) toast.error(`${t("adminApply.error")} ${detail}`);
      else toast.error(t("adminApply.error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Already applied — show the status instead of a duplicate form.
  if (existing) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("adminApply.alreadyTitle")}</CardTitle>
          <CardDescription>{t("adminApply.alreadySubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b py-2">
            <span className="text-muted-foreground">{t("adminApply.statusLabel")}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {existing.status}
            </span>
          </div>
          <p className="text-muted-foreground">{t("adminApply.alreadyHint")}</p>
          {user?.is_staff ? (
            <Button className="w-full" onClick={() => router.push(ROUTES.adminDashboard)}>
              {t("admin.dashboardTitle")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("adminApply.title")}</CardTitle>
        <CardDescription>{t("adminApply.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Request type toggle */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background p-1.5">
            <button
              type="button"
              onClick={() => setRequestType("admin")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                requestType === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t("adminApply.typeResearcher")}
            </button>
            <button
              type="button"
              onClick={() => setRequestType("org")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                requestType === "org"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t("adminApply.typeOrganization")}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {requestType === "org"
              ? t("adminApply.typeOrgHint")
              : t("adminApply.typeResearcherHint")}
          </p>

          <div className="space-y-2">
            <Label htmlFor="apply-name">{t("auth.fullName")}</Label>
            <Input
              id="apply-name"
              required
              dir="auto"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-email">{t("auth.email")}</Label>
            <Input
              id="apply-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {requestType === "org" && (
            <div className="space-y-2">
              <Label htmlFor="apply-org">{t("adminApply.organization")}</Label>
              <Input
                id="apply-org"
                required
                dir="auto"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apply-position">{t("adminApply.position")}</Label>
            <Input
              id="apply-position"
              dir="auto"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-website">{t("adminApply.website")}</Label>
            <Input
              id="apply-website"
              type="url"
              dir="ltr"
              placeholder={t("adminApply.websiteOptional")}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-reason">{t("adminApply.reason")}</Label>
            <textarea
              id="apply-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("adminApply.sending") : t("adminApply.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
