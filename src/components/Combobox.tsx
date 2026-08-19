"use client";

import { useState } from "react";

export type Option = { value: string; label: string; hint?: string };

/** انتخاب با جست‌وجو — برای فهرست‌های بلند فاکتور و کالا */
export function Combobox({
  name,
  options,
  placeholder,
  emptyText = "موردی یافت نشد",
  disabled = false,
  value,
  onChange,
}: {
  name?: string;
  options: Option[];
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(needle))
    : options;

  return (
    <div className="relative">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? q : selected?.label ?? ""}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => setQ(e.target.value)}
        className="disabled:cursor-not-allowed disabled:opacity-50"
      />
      {name && <input type="hidden" name={name} value={value} />}

      {open && !disabled && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--geist-radius)] border border-[var(--geist-border)] bg-[var(--geist-background)] py-1 shadow-[var(--geist-shadow)]">
          {shown.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--geist-tertiary)]">{emptyText}</li>
          )}
          {shown.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm transition hover:bg-[var(--geist-gray-100)] ${
                  o.value === value ? "font-medium" : ""
                }`}
              >
                <span>{o.label}</span>
                {o.hint && (
                  <span className="num text-xs text-[var(--geist-tertiary)]">{o.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
