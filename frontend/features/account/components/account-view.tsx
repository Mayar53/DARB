"use client";

import { Bookmark, CheckCircle, IdentificationCard, PencilSimple, ShieldCheck, Trophy } from "@phosphor-icons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AnimatedHeading } from "@/components/shared/animated-heading";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import { useGamification } from "@/features/gamification";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { authApi } from "@/features/auth/api/auth.api";

/**
 * Emoji avatars — the Darb set: friendly animals, symbols and hobbies.
 * Each entry is one emoji (fits the backend 8-char avatar field).
 */
const AVATARS = [
  "🦅", "🦁", "🐺", "🦊", "🐯", "🦉", "🐢", "🦋", "🐝", "🦩",
  "🐸", "🐙", "🦄", "🐼", "🦜", "🐬", "🦭", "🐲", "🐨", "🦚",
  "🌟", "🔥", "⚡", "🌙", "☀️", "🌈", "🍀", "🎯", "🎨", "🎧",
  "🚀", "🛸", "🌍", "🌺", "🍁", "🥑",
  "👹", "👺", "🎸", "🎤", "🎹", "🎼", "🖌️", "🖼️", "📚", "📖",
  "📕", "🧪", "🔬", "🧬", "⚗️", "💻", "⌨️", "🖥️", "🤖", "👨‍💻",
  "👩‍💻", "🌱", "🌿", "🌳", "🌻", "🌼", "🏀", "⚽", "🏈", "⚾",
  "🏆", "🏅", "🎽", "🥇", "🎮", "🕹️", "👾", "🪐", "👽", "🛰️",
  "🌌", "🐱", "🐾", "⭐", "✨", "💫", "😎", "🙂", "🥳", "🤩",
];

function Row({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" dir={dir}>
        {value}
      </span>
    </div>
  );
}

/** Emoji picker — saves the choice through the existing PATCH /auth/me. */
function AvatarPicker() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = async (avatar: string) => {
    if (saving || avatar === user?.avatar) return;
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ avatar });
      setUser(updated);
      toast.success(t("account.avatarSaved"));
      setOpen(false);
    } catch {
      toast.error(t("account.avatarSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("account.avatarTitle")}
        >
          <UserAvatar user={user} className="size-16 text-3xl" />
          <span className="absolute -right-1 -bottom-1 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors group-hover:text-foreground">
            <PencilSimple size={12} weight="bold" />
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
          <DialogPrimitive.Title className="font-heading text-lg font-bold text-foreground">
            {t("account.avatarTitle")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            {t("account.avatarSubtitle")}
          </DialogPrimitive.Description>

          <div className="mt-5 grid max-h-[50dvh] grid-cols-5 gap-2 overflow-y-auto pe-1 sm:max-h-none sm:grid-cols-8">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={saving}
                onClick={() => void pick(emoji)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border border-border bg-background text-2xl transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50",
                  user?.avatar === emoji && "border-primary bg-primary/10 ring-2 ring-ring/40",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <DialogPrimitive.Close asChild>
              <Button variant="outline">{t("admin.cancel")}</Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Editable name row. Saves through the same PATCH /auth/me as the avatar
 * picker, so the auth store (and every page reading `user.full_name`) updates
 * in place.
 */
function NameEditor({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();

  const openDialog = () => {
    setName(user?.full_name ?? "");
    setOpen(true);
  };

  const save = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ full_name: trimmed });
      setUser(updated);
      toast.success(t("account.nameSaved"));
      setOpen(false);
    } catch {
      toast.error(t("account.nameSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="inline-flex items-center gap-2">
          <span className="font-medium">{value}</span>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              onClick={openDialog}
              aria-label={t("account.editName")}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PencilSimple size={12} weight="bold" />
            </button>
          </DialogPrimitive.Trigger>
        </span>
      </div>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
          <DialogPrimitive.Title className="font-heading text-lg font-bold text-foreground">
            {t("account.editName")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            {t("account.nameSubtitle")}
          </DialogPrimitive.Description>

          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <Label htmlFor="profile-name" className="sr-only">
              {label}
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              autoFocus
              disabled={saving}
            />

            <div className="mt-5 flex justify-end gap-2">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="outline">
                  {t("admin.cancel")}
                </Button>
              </DialogPrimitive.Close>
              <Button type="submit" disabled={saving || trimmed.length === 0}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Post-login screen: the signed-in account with avatar picker. */
export function AccountView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: gamification } = useGamification();

  const isAdmin = !!user?.is_staff;
  const role = isAdmin ? t("account.roleAdmin") : t("account.roleUser");
  const summary = isAdmin ? t("account.summaryAdmin") : t("account.summaryUser");

  const points = gamification?.points ?? user?.points ?? 0;
  const badges = gamification?.badges ?? user?.badges ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <AnimatedHeading
          text={`${t("auth.welcome")} ${user?.nickname || user?.full_name || user?.email || ""}`}
          className="text-2xl font-bold sm:text-3xl"
        />
        {isAdmin && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldCheck size={16} weight="duotone" />
            {t("account.adminBadge")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <AvatarPicker />
        <div>
          <div className="font-semibold text-foreground">
            {user?.nickname || user?.full_name || user?.email}
          </div>
          <div className="text-sm text-muted-foreground" dir="ltr">
            {user?.email}
          </div>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdentificationCard size={22} weight="duotone" />
            {t("account.thisAccount")}
          </CardTitle>
          <CardDescription>{summary}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <NameEditor label={t("account.name")} value={user?.full_name || "—"} />
          {user?.nickname ? <Row label={t("account.nickname")} value={user.nickname} /> : null}
          <Row label={t("account.email")} value={user?.email || "—"} dir="ltr" />
          <Row label={t("account.role")} value={role} />
          <Row
            label={t("account.status")}
            value={user?.is_active ? t("account.active") : t("account.inactive")}
          />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy size={22} weight="duotone" className="text-secondary" />
            {t("profile.pointsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 font-bold text-primary">
            {t("profile.points").replace("{n}", String(points))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.length > 0 ? (
              badges.map((badge) => (
                <span
                  key={badge.key}
                  title={badge.description}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground"
                >
                  <span aria-hidden>{badge.emoji}</span>
                  {badge.name}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">{t("profile.noBadges")}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.saved}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <Bookmark size={22} weight="duotone" className="text-primary" />
          <div>
            <div className="font-semibold text-foreground">{t("home.storiesSavedTitle")}</div>
            <div className="text-sm text-muted-foreground">{t("home.storiesSavedEmpty")}</div>
          </div>
        </Link>
        <Link
          href={ROUTES.applied}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <CheckCircle size={22} weight="duotone" className="text-primary" />
          <div>
            <div className="font-semibold text-foreground">{t("home.appliedTitle")}</div>
            <div className="text-sm text-muted-foreground">{t("home.appliedSubtitle")}</div>
          </div>
        </Link>
        {!isAdmin && (
          <Link
            href={ROUTES.adminApply}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <ShieldCheck size={22} weight="duotone" className="text-primary" />
            <div>
              <div className="font-semibold text-foreground">{t("adminApply.applyAsAdmin")}</div>
              <div className="text-sm text-muted-foreground">{t("adminApply.applyAsAdminHint")}</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
