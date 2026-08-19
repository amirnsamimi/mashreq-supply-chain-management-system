"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { controlBase, controlBorder, controlHeights, FieldError, Label } from "./Input";
import type { ControlSize } from "./Input";

export type Option = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/**
 * فهرست بازشوی سفارشی با جست‌وجو و پیمایش با صفحه‌کلید.
 * مقدار انتخاب‌شده در یک input مخفی با نام واقعی ارسال می‌شود.
 */
export function Combobox({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  emptyText = "موردی یافت نشد",
  disabled = false,
  size = "medium",
  required,
  error,
  searchable = true,
  clearable = true,
}: {
  label?: string;
  name?: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  size?: ControlSize;
  required?: boolean;
  error?: string | null;
  searchable?: boolean;
  clearable?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !searchable) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(needle));
  }, [options, q, searchable]);

  // با باز شدن، روی گزینه انتخاب‌شده بایست
  useEffect(() => {
    if (!open) return;
    const i = shown.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // گزینه فعال همیشه در دید بماند
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
    setQ("");
  }

  function choose(opt: Option) {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
    input.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = shown[active];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  }

  const display = open && searchable ? q : selected?.label ?? "";
  const showPlaceholder = !display;

  return (
    <div className="w-full" ref={box}>
      {label && <Label required={required}>{label}</Label>}

      <div className="relative">
        <div
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            input.current?.focus();
          }}
          className={`${controlBase} ${controlBorder(!!error)} ${controlHeights[size]} flex cursor-pointer items-center gap-1 pr-3 pl-1.5 ${
            disabled ? "cursor-not-allowed bg-[var(--geist-gray-100)]" : ""
          } ${open ? "border-[var(--geist-foreground)] shadow-[0_0_0_3px_var(--geist-gray-alpha)]" : ""}`}
        >
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete={searchable ? "list" : "none"}
            readOnly={!searchable}
            disabled={disabled}
            value={display}
            placeholder={placeholder}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
              if (!open) setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
            onKeyDown={onKeyDown}
            className={`min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[var(--geist-tertiary)] disabled:cursor-not-allowed ${
              showPlaceholder ? "" : "text-[var(--geist-foreground)]"
            }`}
          />

          {selected?.hint && !open && (
            <span className="num shrink-0 text-xs text-[var(--geist-tertiary)]">{selected.hint}</span>
          )}

          {clearable && selected && !disabled && (
            <button
              type="button"
              aria-label="پاک کردن انتخاب"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQ("");
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--geist-tertiary)] transition hover:bg-[var(--geist-gray-100)] hover:text-[var(--geist-foreground)]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}

          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--geist-secondary)]">
            <ChevronIcon open={open} />
          </span>
        </div>

        {name && <input type="hidden" name={name} value={value} />}
        {required && (
          <input
            type="text"
            required
            value={value}
            onChange={() => {}}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-1/2 h-0 w-0 opacity-0"
          />
        )}

        {open && !disabled && (
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            style={{ animation: "geist-fade-in 0.12s ease-out" }}
            className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-1 shadow-[var(--geist-shadow)]"
          >
            {shown.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-[var(--geist-tertiary)]">
                {emptyText}
              </li>
            )}
            {shown.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === active;
              return (
                <li key={o.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`flex w-full items-center gap-2 rounded-[var(--geist-radius)] px-3 py-2 text-right text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isActive ? "bg-[var(--geist-gray-100)]" : ""
                    }`}
                  >
                    <span className={`w-3.5 shrink-0 ${isSelected ? "" : "opacity-0"}`}>
                      <CheckIcon />
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${isSelected ? "font-medium" : ""}`}>
                      {o.label}
                    </span>
                    {o.hint && (
                      <span className="num shrink-0 text-xs text-[var(--geist-tertiary)]">
                        {o.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/**
 * فهرست بازشوی ساده بدون جست‌وجو — جایگزین select بومی
 * تا ظاهرش در همه مرورگرها و در حالت تیره یکسان باشد.
 */
export function Dropdown(props: Omit<Parameters<typeof Combobox>[0], "searchable">) {
  return <Combobox {...props} searchable={false} />;
}
