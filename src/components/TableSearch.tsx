"use client";

import { useState } from "react";

/** جست‌وجوی زنده روی ردیف‌های جدول با data-search */
export function TableSearch({
  placeholder,
  children,
}: {
  placeholder: string;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  return (
    <>
      <div className="border-b border-[var(--geist-border)] p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="!max-w-xs"
        />
      </div>
      <style>{needle ? `tr[data-search]:not([data-search*="${cssEscape(needle)}"]) { display: none }` : ""}</style>
      {children}
    </>
  );
}

function cssEscape(s: string) {
  return s.replace(/["\\]/g, "");
}
