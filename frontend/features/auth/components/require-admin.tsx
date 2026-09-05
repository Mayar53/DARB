"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth.store";

import { RequireAuth } from "./require-auth";

/** Route guard for the admin panel: authenticated AND staff, but NOT the owner. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.is_staff ?? false;
  // The OWNER has their own dashboard — keep them off the admin panel.
  const isOwner = user?.role === "owner";
  const allowed = isStaff && !isOwner;

  useEffect(() => {
    if (user && !allowed) {
      toast.error(t("admin.notStaff"));
      // Owner → owner dashboard; general user → home.
      router.replace(isOwner ? ROUTES.adminDashboard : ROUTES.home);
    }
  }, [user, allowed, isOwner, router, t]);

  return (
    <RequireAuth>
      {allowed ? children : null}
    </RequireAuth>
  );
}
