import Link from "next/link";

import { AdminOpportunities } from "@/features/opportunities";
import { RequireAdmin } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { ROUTES } from "@/lib/constants";

/** Admin entry — staff land on the opportunity manager. */
export default function AdminRoute() {
  return (
    <RequireAdmin>
      <AdminOpportunities />
    </RequireAdmin>
  );
}
