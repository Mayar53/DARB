import { BackHomeNav } from "@/components/shared/back-home-nav";
import { DirectionToggle } from "@/components/shared/direction-toggle";
import { AdminRegisterForm } from "@/features/admin";

/** Public page — Admin Registration (new account + pending request). */
export default function AdminRegisterPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-4">
        <BackHomeNav />
        <DirectionToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <AdminRegisterForm />
      </main>
    </div>
  );
}
