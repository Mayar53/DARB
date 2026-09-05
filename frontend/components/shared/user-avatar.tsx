"use client";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

/** First letters of the display name — used when the user has no avatar. */
export function initialsOf(user: Pick<User, "nickname" | "full_name" | "email">): string {
  const name = user.nickname || user.full_name || user.email || "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The user's avatar. Avatars are stored as a single emoji on the backend
 * (see UserModel.avatar) — rendered as text — with the user's initials as
 * the fallback when no avatar is set.
 */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, "nickname" | "full_name" | "email" | "avatar"> | null;
  className?: string;
}) {
  if (!user) return null;

  const avatar = user.avatar?.trim();
  if (avatar) {
    return (
      <span
        role="img"
        aria-label={avatar}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-lg leading-none",
          className,
        )}
      >
        {avatar}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary",
        className,
      )}
    >
      {initialsOf(user)}
    </span>
  );
}
