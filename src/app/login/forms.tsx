"use client";

import { useActionState } from "react";
import { loginAction, setupAction } from "@/lib/actions";

const btn =
  "mt-4 w-full rounded-[var(--geist-radius)] bg-[var(--geist-foreground)] py-2.5 text-sm font-medium text-[var(--geist-background)] transition hover:opacity-85 disabled:opacity-50";

function Error({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-3 text-sm text-[var(--geist-red-text)]">{children}</p>;
}

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action}>
      <h1 className="mb-1 text-lg font-semibold tracking-tight">پیگیری فاکتور و ارسال</h1>
      <p className="mb-5 text-sm text-[var(--geist-secondary)]">
        با شماره موبایل و رمز عبور خود وارد شوید.
      </p>
      <div className="grid gap-3">
        <div>
          <label>شماره موبایل</label>
          <input name="phone" dir="ltr" placeholder="09121234567" autoFocus required />
        </div>
        <div>
          <label>رمز عبور</label>
          <input name="password" type="password" required />
        </div>
      </div>
      <Error>{error?.error}</Error>
      <button disabled={pending} className={btn}>
        {pending ? "…" : "ورود"}
      </button>
    </form>
  );
}

export function SetupForm() {
  const [error, action, pending] = useActionState(setupAction, null);
  return (
    <form action={action}>
      <h1 className="mb-1 text-lg font-semibold tracking-tight">راه‌اندازی اولیه</h1>
      <p className="mb-5 text-sm text-[var(--geist-secondary)]">
        هنوز کاربری وجود ندارد. اولین کاربر را بسازید؛ بعداً می‌توانید همکارانتان را اضافه کنید.
      </p>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>نام</label>
            <input name="first_name" autoFocus required />
          </div>
          <div>
            <label>نام خانوادگی</label>
            <input name="last_name" required />
          </div>
        </div>
        <div>
          <label>شماره موبایل</label>
          <input name="phone" dir="ltr" placeholder="09121234567" required />
        </div>
        <div>
          <label>رمز عبور (حداقل ۶ کاراکتر)</label>
          <input name="password" type="password" minLength={6} required />
        </div>
      </div>
      <Error>{error?.error}</Error>
      <button disabled={pending} className={btn}>
        {pending ? "…" : "ساخت کاربر و ورود"}
      </button>
    </form>
  );
}
