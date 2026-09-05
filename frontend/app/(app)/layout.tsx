import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth } from "@/features/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
