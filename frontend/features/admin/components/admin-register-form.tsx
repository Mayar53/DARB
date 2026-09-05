"use client";

import Link from "next/link";
import { useState } from "react";
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
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { applyApi } from "../api/apply.api";
import type { AdminApplication } from "../types";

/**
 * Admin Registration form — for NEW people (no account yet).
 *
 * Creates a normal account + a PENDING admin request. No admin access until
 * the OWNER approves. Website is OPTIONAL (empty is stored safely).
 */
export function AdminRegisterForm() {
  const { t } = useTranslation();
  const [requestType, setRequestType] = useState<"admin" | "org">("admin");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<AdminApplication | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!organization.trim()) {
      toast.error(t("adminRegister.orgRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const app = await applyApi.register({
        email,
        password,
        full_name: fullName,
        nickname,
        organization,
        website,
        request_type: requestType,
      });
      setSubmitted(app);
      toast.success(t("adminRegister.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminRegister.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("adminRegister.receivedTitle")}</CardTitle>
          <CardDescription>{t("adminRegister.receivedSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b py-2">
            <span className="text-muted-foreground">{t("adminApply.statusLabel")}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {submitted.status}
            </span>
          </div>
          <Button asChild className="w-full">
            <Link href={ROUTES.login}>{t("auth.toLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("adminRegister.title")}</CardTitle>
        <CardDescription>{t("adminRegister.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Request type */}
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

          <div className="space-y-2">
            <Label htmlFor="reg-name">{t("auth.fullName")} *</Label>
            <Input
              id="reg-name"
              required
              dir="auto"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-nickname">{t("auth.nickname")} *</Label>
            <Input
              id="reg-nickname"
              required
              dir="auto"
              maxLength={64}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">{t("auth.email")} *</Label>
            <Input
              id="reg-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">{t("auth.password")} *</Label>
            <Input
              id="reg-password"
              type="password"
              required
              minLength={8}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-org">{t("adminRegister.organization")} *</Label>
            <Input
              id="reg-org"
              required
              dir="auto"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-website">{t("adminApply.website")}</Label>
            <Input
              id="reg-website"
              type="url"
              dir="ltr"
              placeholder={t("adminApply.websiteOptional")}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">{t("adminRegister.pendingHint")}</p>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("adminRegister.sending") : t("adminRegister.submit")}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href={ROUTES.adminApply} className="font-medium text-primary hover:underline">
            {t("adminRegister.applyWithAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
