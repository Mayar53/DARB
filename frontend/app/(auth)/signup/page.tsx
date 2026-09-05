import { BackHomeNav } from "@/components/shared/back-home-nav";
import { DirectionToggle } from "@/components/shared/direction-toggle";
import { SignupForm } from "@/features/auth";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-4">
        <BackHomeNav />
        <DirectionToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <SignupForm />
      </main>
    </div>
  );
}
