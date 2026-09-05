"use client";

import {
  Check,
  ChevronDown,
  Clock,
  LayoutDashboard,
  LayoutList,
  RotateCcw,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { BackHomeNav } from "@/components/shared/back-home-nav";
import type { User } from "@/lib/types";

import { adminApi } from "../api/admin.api";
import { opportunitiesApi } from "@/features/opportunities/api/opportunities.api";
import type { Opportunity } from "@/lib/types";
import type { AdminApplication, AdminLeaderboardEntry, Permission } from "../types";
import { AdminList } from "./admin-list";
import { OwnerOpportunities } from "./owner-opportunities";
import { OwnerUsers } from "./owner-users";

/**
 * Owner dashboard — split into focused sections with a sidebar so the owner
 * is never shown every table at once:
 *
 *  Overview       — summary cards + action-required items (pending apps, expiring).
 *  Applications   — admin applications by status (pending / waitlisted / rejected).
 *  Admins         — admin accounts (AdminList) + contribution leaderboard.
 *  Users          — registered general users (OwnerUsers).
 *  Opportunities  — all opportunities by status (OwnerOpportunities).
 *
 * Only the OWNER reaches this — the backend enforces it on every call.
 */

type SectionKey = "overview" | "applications" | "admins" | "users" | "opportunities";

const SECTIONS: { key: SectionKey; icon: LucideIcon }[] = [
  { key: "overview", icon: LayoutDashboard },
  { key: "applications", icon: LayoutList },
  { key: "admins", icon: ShieldCheck },
  { key: "users", icon: UsersRound },
  { key: "opportunities", icon: LayoutList },
];

/** One ranked leaderboard row, with expandable submitted opportunities. */
function LeaderboardRow({ entry, rank }: { entry: AdminLeaderboardEntry; rank: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            rank === 1
              ? "bg-secondary text-primary-dark"
              : rank === 2
                ? "bg-muted text-foreground"
                : rank === 3
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/60 text-muted-foreground",
          )}
        >
          {rank}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-base" aria-hidden>
            {entry.avatar || "🙂"}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{entry.admin_name}</div>
            {entry.nickname && (
              <div className="truncate text-xs text-muted-foreground">@{entry.nickname}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-foreground">{entry.total_opportunities}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("admin.leaderboardTotal")}
            </div>
          </div>
          <div className="text-center">
            <div className="font-bold text-emerald-600">{entry.active_opportunities}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("admin.leaderboardActive")}
            </div>
          </div>
        </div>
        {entry.opportunities.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary"
          >
            {entry.opportunities.length}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && entry.opportunities.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
          {entry.opportunities.map((opp) => (
            <li key={opp.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-full bg-primary/50" />
              <span className="truncate">{opp.title}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** A compact summary card used on Overview. */
function SummaryCard({
  label,
  value,
  onClick,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  onClick?: () => void;
  icon: LucideIcon;
  tone?: "default" | "alert" | "success" | "muted";
}) {
  const tones = {
    default: "text-primary",
    alert: "text-secondary",
    success: "text-emerald-600",
    muted: "text-muted-foreground",
  } as const;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-start",
        onClick && "transition-colors hover:border-primary hover:bg-muted/40",
      )}
    >
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className={cn("mt-2 text-2xl font-bold", tones[tone])}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </Comp>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionKey>("overview");
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [unapplied, setUnapplied] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Awaited<ReturnType<typeof adminApi.listAdmins>>>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardEntry[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [apps, unapplied, admins, perms, board, users, opps] = await Promise.all([
          adminApi.listApplications(),
          adminApi.listUnappliedStaff(),
          adminApi.listAdmins(),
          adminApi.listPermissions(),
          adminApi.leaderboard(),
          adminApi.listUsers(),
          opportunitiesApi.listAll(),
        ]);
        if (cancelled) return;
        setApplications(apps);
        setUnapplied(unapplied);
        setAdmins(admins);
        setPermissions(perms);
        setLeaderboard(board);
        setAllUsers(users);
        setAllOpportunities(opps);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : t("admin.dashboardLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [t]);

  /** Re-fetch everything after an owner action (approve/admin change). */
  const refresh = () => {
    setLoading(true);
    void (async () => {
      try {
        const [apps, unapplied, admins, perms, board, users, opps] = await Promise.all([
          adminApi.listApplications(),
          adminApi.listUnappliedStaff(),
          adminApi.listAdmins(),
          adminApi.listPermissions(),
          adminApi.leaderboard(),
          adminApi.listUsers(),
          opportunitiesApi.listAll(),
        ]);
        setApplications(apps);
        setUnapplied(unapplied);
        setAdmins(admins);
        setPermissions(perms);
        setLeaderboard(board);
        setAllUsers(users);
        setAllOpportunities(opps);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("admin.dashboardLoadError"));
      } finally {
        setLoading(false);
      }
    })();
  };

  const pending = useMemo(
    () => applications.filter((a) => a.status === "pending"),
    [applications],
  );
  const waitlisted = useMemo(
    () => applications.filter((a) => a.status === "waitlisted"),
    [applications],
  );
  const rejected = useMemo(
    () => applications.filter((a) => a.status === "rejected" || a.status === "declined"),
    [applications],
  );
  const approved = useMemo(
    () => applications.filter((a) => a.status === "approved"),
    [applications],
  );
  const activeAdmins = useMemo(() => admins.filter((a) => a.is_active), [admins]);
  const totalUsers = useMemo(
    () => allUsers.filter((u) => u.role === "user").length,
    [allUsers],
  );
  const oppCounts = useMemo(() => {
    const today = new Date();
    let published = 0;
    let hidden = 0;
    let drafts = 0;
    let expired = 0;
    for (const o of allOpportunities) {
      const status = o.status ?? (o.is_active ? "published" : "hidden");
      if (status === "draft") drafts += 1;
      else if (status === "hidden") hidden += 1;
      else if (status === "archived") expired += 1;
      else {
        // published — expired if the deadline has passed.
        const deadline = o.deadline ? new Date(`${o.deadline}T23:59:59`) : null;
        if (deadline && deadline.getTime() < today.getTime()) expired += 1;
        else published += 1;
      }
    }
    return { total: allOpportunities.length, published, hidden, drafts, expired };
  }, [allOpportunities]);

  const adminByUserId = useMemo(() => {
    const map = new Map<number, (typeof admins)[number]>();
    for (const admin of admins) map.set(admin.id, admin);
    return map;
  }, [admins]);

  const review = async (
    application: AdminApplication,
    action: "approve" | "waitlist" | "pending" | "reject",
  ) => {
    try {
      const updated =
        action === "approve"
          ? await adminApi.approveApplication(application.id)
          : action === "waitlist"
            ? await adminApi.waitlistApplication(application.id)
            : action === "pending"
              ? await adminApi.pendingApplication(application.id)
              : await adminApi.rejectApplication(application.id);
      toast.success(
        action === "approve"
          ? t("admin.approved")
          : action === "waitlist"
            ? t("admin.waitlisted")
            : action === "pending"
              ? t("admin.movedToPending")
              : t("admin.rejected"),
      );
      setApplications((prev) =>
        prev.map((a) => (a.id === application.id ? updated : a)),
      );
      if (action === "approve") refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.reviewError"));
    }
  };

  const reviewUnapplied = async (user: User, action: "approve" | "waitlist" | "reject") => {
    try {
      const app = await adminApi.createApplicationForUser(user.id);
      setApplications((prev) =>
        prev.some((a) => a.id === app.id) ? prev : [...prev, app],
      );
      setUnapplied((prev) => prev.filter((u) => u.id !== user.id));
      await review(app, action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.reviewError"));
    }
  };

  const ApplicationActions = ({
    application,
  }: {
    application: AdminApplication;
  }) => {
    const isWaitlisted = application.status === "waitlisted";
    if (application.status === "approved") return null;
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void review(application, "approve")}>
          <Check className="size-3.5" />
          {t("admin.approve")}
        </Button>
        {!isWaitlisted ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void review(application, "waitlist")}
          >
            <Clock className="size-3.5" />
            {t("admin.waitlist")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void review(application, "pending")}
          >
            <RotateCcw className="size-3.5" />
            {t("admin.moveToPending")}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => void review(application, "reject")}
        >
          <X className="size-3.5" />
          {t("admin.reject")}
        </Button>
      </div>
    );
  };

  const ApplicationCard = ({ application }: { application: AdminApplication }) => {
    const linkedAdmin =
      application.user_id != null ? adminByUserId.get(application.user_id) : undefined;
    const isApproved = application.status === "approved";
    return (
      <li className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{application.full_name}</span>
            {application.nickname && (
              <span className="text-muted-foreground">({application.nickname})</span>
            )}
            {isApproved && linkedAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                <ShieldCheck className="size-3" />
                {t("admin.adminAccountActive")}
              </span>
            )}
          </div>
          <div className="text-muted-foreground" dir="ltr">
            {application.email}
          </div>
          {application.organization && (
            <div className="text-muted-foreground">
              {application.organization}
              {application.position ? ` · ${application.position}` : ""}
            </div>
          )}
          {application.reason && (
            <p className="mt-1 max-w-2xl text-muted-foreground">{application.reason}</p>
          )}
          {application.website && (
            <a
              href={application.website}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="mt-1 text-xs text-primary hover:underline"
            >
              {application.website}
            </a>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {new Date(application.created_at).toLocaleDateString()}
          </div>
        </div>
        <ApplicationActions application={application} />
      </li>
    );
  };

  const UnappliedCard = ({ user }: { user: User }) => (
    <li className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{user.full_name || user.email}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {user.role}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            {t("admin.noApplication")}
          </span>
        </div>
        <div className="text-muted-foreground" dir="ltr">
          {user.email}
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.noApplicationHint")}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void reviewUnapplied(user, "approve")}>
          <Check className="size-3.5" />
          {t("admin.approve")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void reviewUnapplied(user, "waitlist")}>
          <Clock className="size-3.5" />
          {t("admin.waitlist")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => void reviewUnapplied(user, "reject")}
        >
          <X className="size-3.5" />
          {t("admin.reject")}
        </Button>
      </div>
    </li>
  );

  const navLabels: Record<SectionKey, string> = {
    overview: t("admin.navOverview"),
    applications: t("admin.navApplications"),
    admins: t("admin.navAdmins"),
    users: t("admin.navUsers"),
    opportunities: t("admin.navOpportunities"),
  };

  const goToApplications = () => setSection("applications");
  const goToOpportunities = () => setSection("opportunities");
  const goToAdmins = () => setSection("admins");
  const goToUsers = () => setSection("users");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full shrink-0 lg:w-56">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 lg:flex-col lg:overflow-visible">
          {SECTIONS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                section === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {navLabels[key]}
              {key === "applications" && pending.length + unapplied.length > 0 && (
                <span
                  className={cn(
                    "ms-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                    section === key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary/20 text-secondary",
                  )}
                >
                  {pending.length + unapplied.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <BackHomeNav />
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {t("admin.dashboardTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("admin.dashboardSubtitle")}</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <>
            {section === "overview" && (
              <>
                {/* Summary counts */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <SummaryCard
                    label={t("admin.ownerTotalUsers")}
                    value={totalUsers}
                    icon={UsersRound}
                    onClick={goToUsers}
                  />
                  <SummaryCard
                    label={t("admin.ownerTotalAdmins")}
                    value={activeAdmins.length}
                    icon={ShieldCheck}
                    tone="success"
                    onClick={goToAdmins}
                  />
                  <SummaryCard
                    label={t("admin.statusPending")}
                    value={pending.length + unapplied.length}
                    icon={LayoutList}
                    tone="alert"
                    onClick={goToApplications}
                  />
                  <SummaryCard
                    label={t("admin.ownerWaitlisted")}
                    value={waitlisted.length}
                    icon={Clock}
                    onClick={goToApplications}
                  />
                  <SummaryCard
                    label={t("admin.oppStatusPublished")}
                    value={oppCounts.published}
                    icon={LayoutList}
                    tone="success"
                    onClick={goToOpportunities}
                  />
                  <SummaryCard
                    label={t("admin.ownerHiddenOpportunities")}
                    value={oppCounts.hidden}
                    icon={LayoutList}
                    onClick={goToOpportunities}
                  />
                  <SummaryCard
                    label={t("admin.ownerTotalOpportunities")}
                    value={oppCounts.total}
                    icon={LayoutList}
                    onClick={goToOpportunities}
                  />
                  <SummaryCard
                    label={t("admin.ownerExpiredOpportunities")}
                    value={oppCounts.expired}
                    icon={Clock}
                    tone="muted"
                    onClick={goToOpportunities}
                  />
                </div>

                {/* Action-required items */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {pending.length + unapplied.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("admin.ownerActionRequired")}</CardTitle>
                        <CardDescription>{t("admin.ownerActionApplications")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={goToApplications} variant="outline" size="sm">
                          {t("admin.navApplications")} ({pending.length + unapplied.length})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  {waitlisted.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("admin.statusWaitlisted")}</CardTitle>
                        <CardDescription>{t("admin.ownerWaitlistedHint")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={goToApplications} variant="outline" size="sm">
                          {t("admin.navApplications")} ({waitlisted.length})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  {oppCounts.published > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("admin.oppStatusPublished")}</CardTitle>
                        <CardDescription>{t("admin.ownerPublishedHint")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={goToOpportunities} variant="outline" size="sm">
                          {t("admin.navOpportunities")} ({oppCounts.published})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            {section === "applications" && (
              <div className="flex flex-col gap-6">
                {/* A. New (Pending) + unapplied */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("admin.statusPending")}</CardTitle>
                    <CardDescription>{t("admin.applicationsSubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pending.length === 0 && unapplied.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.applicationsEmpty")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {pending.map((application) => (
                          <ApplicationCard key={application.id} application={application} />
                        ))}
                        {unapplied.map((user) => (
                          <UnappliedCard key={user.id} user={user} />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* B. Approved */}
                {approved.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("admin.statusApproved")}</CardTitle>
                      <CardDescription>{t("admin.approvedEmpty")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {approved.map((application) => (
                          <ApplicationCard key={application.id} application={application} />
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* C. Waitlisted */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("admin.statusWaitlisted")}</CardTitle>
                    <CardDescription>{t("admin.waitlistedEmpty")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {waitlisted.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.waitlistedEmpty")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {waitlisted.map((application) => (
                          <ApplicationCard key={application.id} application={application} />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* C. Rejected */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("admin.statusRejected")}</CardTitle>
                    <CardDescription>{t("admin.rejectedEmpty")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rejected.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.rejectedEmpty")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {rejected.map((application) => (
                          <ApplicationCard key={application.id} application={application} />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "admins" && (
              <div className="flex flex-col gap-6">
                <AdminList
                  admins={admins}
                  permissions={permissions}
                  onChanged={refresh}
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy size={20} className="text-secondary" />
                      {t("admin.leaderboardTitle")}
                    </CardTitle>
                    <CardDescription>{t("admin.leaderboardSubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.leaderboardEmpty")}</p>
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {leaderboard.map((entry, index) => (
                          <LeaderboardRow key={entry.admin_id} entry={entry} rank={index + 1} />
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "users" && <OwnerUsers />}

            {section === "opportunities" && <OwnerOpportunities />}
          </>
        )}
      </div>
    </div>
  );
}
