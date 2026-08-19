"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormResult } from "@/lib/actions";
import { Note } from "./geist/Feedback";
import { SubmitButton } from "./geist/Button";
import type { ButtonProps } from "./geist/Button";

/**
 * فرمی که نتیجهٔ اکشن سروری (خطا یا موفقیت) را خودش نمایش می‌دهد.
 * children می‌تواند تابعی باشد که نتیجه را می‌گیرد.
 */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  hideResult = false,
}: {
  action: (prev: FormResult, fd: FormData) => Promise<FormResult>;
  children: React.ReactNode | ((state: FormResult) => React.ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  hideResult?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const lastOk = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (resetOnSuccess && state?.ok && state.ok !== lastOk.current) {
      lastOk.current = state.ok;
      ref.current?.reset();
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {typeof children === "function" ? children(state) : children}
      {!hideResult && state?.error && (
        <div className="mt-3">
          <Note type="error">{state.error}</Note>
        </div>
      )}
      {!hideResult && state?.ok && (
        <div className="mt-3">
          <Note type="success">{state.ok}</Note>
        </div>
      )}
    </form>
  );
}

/** دکمه ارسال با متن پیش‌فرض */
export function Submit(props: ButtonProps) {
  return <SubmitButton variant="primary" {...props} />;
}
