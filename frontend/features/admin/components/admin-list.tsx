"use client";

import { ChevronDown, Plus, Power } from "lucide-react";
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
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

import { adminApi } from "../api/admin.api";
import type { Permission } from "../types";

/**
 * Admin accounts management: list, activate/deactivate, create directly, and
 * toggle each admin's permissions with checkboxes (no code editing needed).
 */
export function AdminList({
  admins,
  permissions,
  onChanged,
}: {
  admins: User[];
  permissions: Permission[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draftPerms, setDraftPerms] = useState<Record<number, string[]>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  const toggleActive = async (admin: User) => {
    try {
      await adminApi.updateAdmin(admin.id, { is_active: !admin.is_active });
      toast.success(admin.is_active ? t("admin.adminDeactivated") : t("admin.adminActivated"));
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.adminUpdateError"));
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.createAdmin({ email, password, full_name: fullName });
      toast.success(t("admin.adminCreated"));
      setEmail("");
      setFullName("");
      setPassword("");
      setShowCreate(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.adminCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (adminId: number, key: string) => {
    setDraftPerms((prev) => {
      const current = prev[adminId] ?? admins.find((a) => a.id === adminId)?.permissions ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, [adminId]: next };
    });
  };

  const savePermissions = async (admin: User) => {
    setSavingPerms(true);
    try {
      const perms = draftPerms[admin.id] ?? admin.permissions;
      await adminApi.updateAdmin(admin.id, { permissions: perms });
      toast.success(t("admin.permissionsSaved"));
      setDraftPerms((prev) => {
        const next = { ...prev };
        delete next[admin.id];
        return next;
      });
      setOpenId(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.permissionsSaveError"));
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("admin.adminsTitle")}
          <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="size-3.5" />
            {t("admin.newAdmin")}
          </Button>
        </CardTitle>
        <CardDescription>{t("admin.adminsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreate && (
          <form
            onSubmit={create}
            className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">{t("auth.email")}</Label>
              <Input
                id="admin-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">{t("auth.fullName")}</Label>
              <Input
                id="admin-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="admin-password">{t("auth.password")}</Label>
              <Input
                id="admin-password"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t("admin.saveLoading") : t("admin.createAdmin")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                {t("admin.cancel")}
              </Button>
            </div>
          </form>
        )}

        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.adminsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {admins.map((admin) => {
              const isOwner = admin.role === "owner";
              const isOpen = openId === admin.id;
              const currentPerms = draftPerms[admin.id] ?? admin.permissions;
              return (
                <li
                  key={admin.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {admin.full_name || admin.email}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {admin.role}
                        </span>
                        {!admin.is_active && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-destructive">
                            {t("account.inactive")}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground" dir="ltr">
                        {admin.email}
                      </div>
                      {admin.permissions.length > 0 && (
                        <div className="mt-1 flex max-w-xl flex-wrap gap-1">
                          {admin.permissions.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
                            >
                              {permissions.find((c) => c.key === p)?.label ?? p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isOwner && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (isOpen) {
                                setOpenId(null);
                              } else {
                                setOpenId(admin.id);
                                setDraftPerms((prev) => ({ ...prev, [admin.id]: admin.permissions }));
                              }
                            }}
                          >
                            <ChevronDown
                              className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                            />
                            {t("admin.permissions")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleActive(admin)}
                          >
                            <Power className="size-3.5" />
                            {admin.is_active ? t("admin.deactivate") : t("admin.activate")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isOpen && !isOwner && (
                    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.permissionsSubtitle")}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {permissions.map((perm) => {
                          const checked = currentPerms.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => void togglePermission(admin.id, perm.key)}
                                className="size-4 accent-primary"
                              />
                              <span className={cn(checked && "font-medium")}>{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button size="sm" onClick={() => void savePermissions(admin)} disabled={savingPerms}>
                          {savingPerms ? t("admin.saveLoading") : t("admin.savePermissions")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setOpenId(null)}>
                          {t("admin.cancel")}
                        </Button>
                      </div>
                    </div>
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
