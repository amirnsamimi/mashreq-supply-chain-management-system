"use client";

import { useFormStatus } from "react-dom";

/** دکمه ارسال فرم با تأیید و حالت «در حال انجام» */
export function SubmitBtn({
  children,
  confirm,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  confirm?: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary:
      "bg-[var(--geist-foreground)] text-[var(--geist-background)] hover:opacity-85 px-3.5 py-2 text-sm font-medium",
    ghost:
      "border border-[var(--geist-border)] hover:border-[var(--geist-foreground)] px-3.5 py-2 text-sm font-medium",
    danger:
      "text-[var(--geist-red-text)] hover:bg-[var(--geist-red-lighter)] px-2 py-1 text-xs font-medium",
  };
  return (
    <button
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`inline-flex items-center justify-center rounded-[var(--geist-radius)] transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
