"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SiteFooter, SiteNav } from "@/features/opportunities";
import { profileApi } from "@/features/profile";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useTranslation } from "@/hooks/use-translation";
import type { PublicProfile } from "@/lib/types";

/** A user's public profile — avatar, nickname, points and badges. */
export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const id = Number((await params).id);
        if (!Number.isFinite(id)) {
          setStatus("notfound");
          return;
        }
        const data = await profileApi.getPublic(id);
        if (!cancelled) {
          setProfile(data);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("notfound");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        {status === "loading" && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

        {status === "notfound" && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {t("profile.notFound")}{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              {t("home.back")}
            </Link>
          </div>
        )}

        {status === "ready" && profile && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                user={{ nickname: profile.nickname, avatar: profile.avatar } as never}
                className="size-16 text-3xl"
              />
              <div>
                <div className="font-heading text-2xl font-bold text-foreground">
                  {profile.nickname || t("profile.anonymous")}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-bold text-primary">
                  {t("profile.points").replace("{n}", String(profile.points))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.badges.length > 0 ? (
                profile.badges.map((badge) => (
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
                <span className="text-sm text-muted-foreground">{t("profile.noBadges")}</span>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
