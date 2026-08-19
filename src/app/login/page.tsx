import { redirect } from "next/navigation";
import { currentUser, hasUsers } from "@/lib/auth";
import { InstallButton } from "@/components/PWA";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginForm, SetupForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const exists = await hasUsers();

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-6">
          {exists ? <LoginForm /> : <SetupForm />}
        </div>
        {/* پیش از ورود هم کاربر بتواند تم را انتخاب کند و برنامه را نصب کند */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <InstallButton />
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
