"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth.store";

import { RequireAuth } from "./require-auth";

/** Route guard for the OWNER dashboard: authenticated AND role === owner. */
export function RequireOwner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (user && !isOwner) {
      toast.error(t("admin.notStaff"));
      // An admin belongs on the admin dashboard; everyone else goes home.
      const target = user.is_staff ? ROUTES.admin : ROUTES.home;
      router.replace(target);
    }
  }, [user, isOwner, router, t]);

  return <RequireAuth>{isOwner ? children : null}</RequireAuth>;
}
