"use client";

import Link from "next/link";
import { useState } from "react";

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

import { useAuth } from "../hooks/use-auth";

export function LoginForm() {
  const { login, loading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await login({ email, password });
    setSubmitting(false);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
        <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              dir="ltr"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || submitting}>
            {loading ? t("auth.loginLoading") : t("auth.loginBtn")}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href={ROUTES.signup} className="font-medium text-primary hover:underline">
            {t("auth.toSignup")}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href={ROUTES.adminRegister} className="font-medium text-primary hover:underline">
            {t("adminRegister.title")}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href={ROUTES.forgotPassword} className="font-medium text-primary hover:underline">
            {t("auth.forgotPassword")}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href={ROUTES.adminApply} className="font-medium text-primary hover:underline">
            {t("home.applyToTeam")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
