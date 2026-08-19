import { redirect } from "next/navigation";
import { currentUser, hasUsers } from "@/lib/auth";
import { LoginForm, SetupForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const exists = await hasUsers();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-6">
        {exists ? <LoginForm /> : <SetupForm />}
      </div>
    </main>
  );
}
