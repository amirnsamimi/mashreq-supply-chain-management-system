"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** null یعنی نوار پایین اصلاً نمایش داده نشود */
  footer?: React.ReactNode | null;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        ref={ref}
        style={{ maxWidth: width, animation: "geist-fade-in 0.15s ease-out" }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] shadow-[var(--geist-shadow)] sm:rounded-[var(--geist-radius-lg)]"
      >
        <div className="border-b border-[var(--geist-border)] px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--geist-secondary)]">{description}</p>
          )}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer !== null && (
          <div className="flex justify-end gap-2 border-t border-[var(--geist-border)] bg-[var(--geist-background-subtle)] px-5 py-3">
            {footer ?? (
              <Button size="small" onClick={onClose}>
                بستن
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
