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

import { authApi } from "../api/auth.api";

/** Self-service password recovery: request a code, then set a new password. */
export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setStep("reset");
      toast.success(t("auth.resetCodeSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resetRequestError"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.resetMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email, code, new_password: newPassword });
      setDone(true);
      toast.success(t("auth.resetDone"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resetError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.resetDoneTitle")}</CardTitle>
          <CardDescription>{t("auth.resetDoneSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={ROUTES.login}>{t("auth.toLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.resetTitle")}</CardTitle>
        <CardDescription>
          {step === "request" ? t("auth.resetSubtitle") : t("auth.resetCodeSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "request" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t("auth.email")}</Label>
              <Input
                id="reset-email"
                type="email"
                required
                dir="ltr"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.resetSending") : t("auth.resetSend")}
            </Button>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-code">{t("auth.resetCode")}</Label>
              <Input
                id="reset-code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                dir="ltr"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {/* Hint: reset emails can land in Spam/Junk — ask users to check
                  there before requesting yet another code. */}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("auth.resetCheckSpam")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">{t("auth.newPassword")}</Label>
              <Input
                id="reset-new-password"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">{t("auth.confirmPassword")}</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
