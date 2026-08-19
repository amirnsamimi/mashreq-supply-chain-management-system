"use client";
import { useState } from "react";

export function Collapse({
  label,
  children,
  open: initial = false,
}: {
  label: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-[var(--geist-radius)] bg-[var(--geist-foreground)] px-3.5 py-2 text-sm font-medium text-[var(--geist-background)] transition hover:opacity-85"
      >
        {open ? "بستن" : `+ ${label}`}
      </button>
      {open && (
        <div className="mt-3 w-full basis-full">
          {children}
        </div>
      )}
    </>
  );
}
