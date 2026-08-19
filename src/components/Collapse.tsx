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
        className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        {open ? "بستن" : label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </>
  );
}
