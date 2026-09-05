import { BackHomeNav } from "@/components/shared/back-home-nav";
import { DirectionToggle } from "@/components/shared/direction-toggle";
import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-4">
        <BackHomeNav />
        <DirectionToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <LoginForm />
      </main>
    </div>
  );
}
