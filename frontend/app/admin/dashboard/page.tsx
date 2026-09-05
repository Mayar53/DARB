import { RequireOwner } from "@/features/auth";
import { AdminDashboard } from "@/features/admin";

/** Owner dashboard — review admin applications and manage admins. OWNER-only. */
export default function AdminDashboardPage() {
  return (
    <RequireOwner>
      <AdminDashboard />
    </RequireOwner>
  );
}
