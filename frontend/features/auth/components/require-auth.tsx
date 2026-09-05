"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth.store";

/** True once the persisted auth store has finished rehydrating from storage. */
function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}

/** Client-side route guard. JWT lives in the persisted store, not cookies. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkingSession = useAuthStore((s) => s.checkingSession);
  const hydrated = useStoreHydrated();

  useEffect(() => {
    if (hydrated && !checkingSession && !isAuthenticated) router.replace(ROUTES.login);
  }, [hydrated, checkingSession, isAuthenticated, router]);

  if (!hydrated || checkingSession || !isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }
  return <>{children}</>;
}
