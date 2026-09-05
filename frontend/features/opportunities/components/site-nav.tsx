"use client";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Bookmark, ChevronDown, LogOut, Rows3, Search, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DirectionToggle } from "@/components/shared/direction-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/hooks/use-translation";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { useOpportunitiesStore } from "../store/opportunities.store";

/** Signed-in menu: avatar + name opening a dropdown to the account pages. */
function AccountMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const items = [
    { href: ROUTES.account, label: t("nav.account"), icon: UserCircle },
    { href: ROUTES.saved, label: t("home.storiesSavedTitle"), icon: Bookmark },
    { href: ROUTES.applied, label: t("home.appliedTitle"), icon: Bookmark },
    // Admin → admin panel; Owner → owner dashboard; general users → nothing.
    ...(user?.role === "owner"
      ? [{ href: ROUTES.adminDashboard, label: t("admin.dashboardTitle"), icon: Rows3 }]
      : user?.is_staff
        ? [{ href: ROUTES.admin, label: t("nav.manage"), icon: Rows3 }]
        : []),
  ];

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full border-border px-2 font-semibold text-foreground sm:px-3"
          aria-label={t("nav.account")}
        >
          <UserAvatar user={user} className="size-7 text-base" />
          <span className="hidden max-w-28 truncate sm:inline">
            {user?.nickname || user?.full_name || user?.email}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          {items.map(({ href, label, icon: Icon }) => (
            <DropdownMenuPrimitive.Item
              key={href}
              asChild
              className={cn(
                "cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium text-foreground outline-none data-highlighted:bg-muted",
                pathname === href && "bg-muted text-primary",
              )}
            >
              <Link href={href} className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Link>
            </DropdownMenuPrimitive.Item>
          ))}
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item
            onSelect={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive outline-none data-highlighted:bg-destructive/10"
          >
            <LogOut className="size-4" />
            {t("common.logout")}
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

/** Sticky public nav — floating pill shell with logo, search, account. */
export function SiteNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAuthenticated, hydrated } = useAuth();
  const search = useOpportunitiesStore((s) => s.search);
  const setSearch = useOpportunitiesStore((s) => s.setSearch);

  return (
    <header className="sticky top-3 z-50">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between gap-4 rounded-full border border-border bg-card px-5 py-2.5 shadow-[0_4px_18px_rgba(14,71,73,0.08)]">
        <Link href={ROUTES.home} className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/favicondarb.png"
            alt="DARB logo"
            width={34}
            height={34}
            className="size-[34px] shrink-0 rounded-[10px] object-cover shadow-[0_4px_10px_rgba(14,71,73,0.25)]"
          />
          <span className="font-heading text-[22px] font-bold tracking-tight text-primary">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-x-auto whitespace-nowrap sm:gap-3 sm:overflow-visible">
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#about" className="transition-colors hover:text-primary">
              {t("home.about")}
            </a>
            <a href="#contact" className="transition-colors hover:text-primary">
              {t("home.contact")}
            </a>
          </div>

          <div className="hidden h-9 w-full max-w-[260px] shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 transition-all focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 md:flex">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Account/auth actions + language/theme toggles — one cluster at the bar end. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAuthenticated && (
              <Link
                href={ROUTES.saved}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-4",
                  pathname === ROUTES.saved && "border-primary text-primary",
                )}
              >
                <Bookmark className="size-4" />
                <span className="hidden sm:inline">{t("home.storiesSavedTitle")}</span>
              </Link>
            )}

            {hydrated && isAuthenticated ? (
              <AccountMenu />
            ) : isAuthenticated && !hydrated ? (
              // Waiting for the persisted session to rehydrate — keep the nav stable.
              <span className="inline-flex h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
            ) : (
              <>
                <Link
                  href={ROUTES.login}
                  className="shrink-0 rounded-full border border-primary bg-transparent px-3 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:px-4"
                >
                  {t("auth.loginBtn")}
                </Link>
                <Link
                  href={ROUTES.signup}
                  className="shrink-0 rounded-full border border-primary bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-dark sm:px-4"
                >
                  {t("auth.signupBtn")}
                </Link>
              </>
            )}

            <div className="shrink-0">
              <DirectionToggle />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
