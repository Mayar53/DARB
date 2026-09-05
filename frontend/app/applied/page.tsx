import { RequireAuth } from "@/features/auth";
import { SiteFooter, SiteNav } from "@/features/opportunities";

import { AppliedView } from "@/features/applied";

/** Applied opportunities — requires login (account-specific feature). */
export default function AppliedPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-full flex-col">
        <SiteNav />

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
          <AppliedView />
        </main>

        <SiteFooter />
      </div>
    </RequireAuth>
  );
}
