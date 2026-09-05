"use client";

import { Bookmark, LogOut, Rows3, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DirectionToggle } from "@/components/shared/direction-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/hooks/use-translation";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: ROUTES.account, key: "nav.account", icon: User, staffOnly: false },
  { href: ROUTES.saved, key: "home.storiesSavedTitle", icon: Bookmark, staffOnly: false },
  { href: ROUTES.applied, key: "home.appliedTitle", icon: Bookmark, staffOnly: false },
  { href: ROUTES.admin, key: "nav.manage", icon: Rows3, staffOnly: true, ownerOnly: false },
  { href: ROUTES.adminDashboard, key: "admin.dashboardTitle", icon: Rows3, staffOnly: true, ownerOnly: true },
] as const satisfies ReadonlyArray<{
  href: string;
  key: MessageKey;
  icon: typeof User;
  staffOnly: boolean;
  ownerOnly?: boolean;
}>;

/**
 * Authenticated application shell: persistent sidebar + topbar that wrap every
 * page under the `(app)` route group. New feature pages plug in as nav items.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const isAdmin = user?.is_staff ?? false;
  const isOwner = user?.role === "owner";

  const navLinks = (collapsed = false) =>
    NAV.filter(
      (item) =>
        !item.staffOnly ||
        (isAdmin && (item.ownerOnly ? isOwner : !isOwner)),
    ).map(({ href, key, icon: Icon }) => {
      const active = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "flex-1 justify-center",
          )}
        >
          <Icon className="size-4" />
          {t(key)}
        </Link>
      );
    });

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-e bg-muted/30 p-4 md:flex">
        <Link href={ROUTES.home} className="flex items-center gap-2.5 px-2 py-3">
          <Image
            src="/favicondarb.png"
            alt="DARB logo"
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-lg object-cover"
          />
          <span className="text-lg font-bold">{APP_NAME}</span>
        </Link>
        <nav className="mt-4 flex flex-col gap-1">{navLinks()}</nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="font-semibold md:hidden">{APP_NAME}</span>
          <div className="hidden text-sm text-muted-foreground md:block">{user?.email}</div>
          <div className="flex items-center gap-2">
            <DirectionToggle />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="size-4" />
              {t("common.logout")}
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 border-b px-4 py-2 md:hidden">{navLinks(true)}</nav>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
