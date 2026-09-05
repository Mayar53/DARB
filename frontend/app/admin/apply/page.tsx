import { BackHomeNav } from "@/components/shared/back-home-nav";
import { DirectionToggle } from "@/components/shared/direction-toggle";
import { AdminApplyForm } from "@/features/admin";

/** Public page — apply to become an admin. No login required. */
export default function AdminApplyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-4">
        <BackHomeNav />
        <DirectionToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <AdminApplyForm />
      </main>
    </div>
  );
}
