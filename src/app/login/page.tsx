"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6"
      >
        <h1 className="mb-1 text-lg font-bold">پیگیری فاکتور و ارسال</h1>
        <p className="mb-5 text-sm text-gray-500">برای ورود رمز عبور مشترک را وارد کنید.</p>
        <input
          name="password"
          type="password"
          placeholder="رمز عبور"
          autoFocus
          required
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "…" : "ورود"}
        </button>
      </form>
    </main>
  );
}
