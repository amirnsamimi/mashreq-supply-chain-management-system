"use client";

import { useActionState } from "react";
import { changeOwnPassword, createUser, resetPassword } from "@/lib/actions";
import { Card, Field } from "@/components/ui";

const btn =
  "inline-flex items-center justify-center rounded-[var(--geist-radius)] bg-[var(--geist-foreground)] px-3.5 py-2 text-sm font-medium text-[var(--geist-background)] transition hover:opacity-85 disabled:opacity-50";

export function CreateUserForm() {
  const [error, action, pending] = useActionState(createUser, null);
  return (
    <Card className="p-4">
      <form action={action} className="grid gap-3 md:grid-cols-4">
        <Field label="نام *">
          <input name="first_name" required />
        </Field>
        <Field label="نام خانوادگی *">
          <input name="last_name" required />
        </Field>
        <Field label="شماره موبایل *">
          <input name="phone" dir="ltr" placeholder="09121234567" required />
        </Field>
        <Field label="رمز عبور *">
          <input name="password" type="password" minLength={6} required />
        </Field>
        <div className="md:col-span-4">
          <button disabled={pending} className={btn}>
            {pending ? "…" : "افزودن کاربر"}
          </button>
          {error && <span className="mr-3 text-sm text-[var(--geist-red-text)]">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

export function ResetPasswordForm({ id, name }: { id: number; name: string }) {
  const [error, action, pending] = useActionState(resetPassword, null);
  return (
    <details className="inline-block">
      <summary className="cursor-pointer text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]">
        تغییر رمز
      </summary>
      <div className="absolute left-0 z-10 mt-2 w-[min(16rem,calc(100vw-3rem))] rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-3 shadow-[var(--geist-shadow)]">
        <form action={action} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <Field label={`رمز جدید برای ${name}`}>
            <input name="password" type="password" minLength={6} required />
          </Field>
          <button disabled={pending} className={btn}>
            {pending ? "…" : "ثبت رمز جدید"}
          </button>
          {error && <p className="text-xs text-[var(--geist-red-text)]">{error}</p>}
        </form>
      </div>
    </details>
  );
}

export function ChangeOwnPasswordForm() {
  const [error, action, pending] = useActionState(changeOwnPassword, null);
  return (
    <Card title="تغییر رمز عبور خودم">
      <form action={action} className="grid gap-3 p-4 md:grid-cols-3">
        <Field label="رمز فعلی">
          <input name="current_password" type="password" required />
        </Field>
        <Field label="رمز جدید (حداقل ۶ کاراکتر)">
          <input name="password" type="password" minLength={6} required />
        </Field>
        <div className="flex items-end">
          <button disabled={pending} className={btn}>
            {pending ? "…" : "تغییر رمز"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-[var(--geist-red-text)] md:col-span-3">{error}</p>
        )}
      </form>
    </Card>
  );
}
