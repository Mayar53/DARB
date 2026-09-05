"use client";

import { ExternalLink, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { User } from "@/lib/types";

import { adminApi } from "../api/admin.api";

const PAGE_SIZE = 20;

/** Owner: registered general users with search + pagination. */
export function OwnerUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listUsers()
      .then((list) => {
        if (!cancelled) setUsers(list.filter((u) => u.role === "user"));
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.nickname || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-5 text-primary" />
          {t("admin.usersSectionTitle")}
        </CardTitle>
        <CardDescription>{t("admin.usersSectionSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t("admin.usersSearch")}
            className="ps-9"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query ? t("admin.usersSearchEmpty") : t("admin.usersNone")}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {visible.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} className="size-9 text-base" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">
                        {user.nickname || user.full_name || user.email}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" dir="ltr">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        user.is_active
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600"
                          : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                      }
                    >
                      {user.is_active ? t("account.active") : t("account.inactive")}
                    </span>
                    <Link
                      href={`/users/${user.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary"
                    >
                      <ExternalLink className="size-3" />
                      {t("admin.usersViewProfile")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  {t("admin.paginationPrev")}
                </Button>
                <span className="text-muted-foreground">
                  {currentPage + 1} / {pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  {t("admin.paginationNext")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
