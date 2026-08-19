"use client";

import { useEffect, useRef, useState } from "react";
import {
  JALALI_MONTHS,
  WEEKDAYS,
  isoToJalaliString,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  jalaliStringToIso,
  toGregorian,
  toJalali,
  todayJalali,
} from "@/lib/jalali";
import { controlBase, controlBorder, FieldError, Label } from "./Input";
import { Button } from "./Button";

const pad = (n: number) => String(n).padStart(2, "0");
/** رقم فارسی و عربی را به لاتین تبدیل می‌کند تا کاربر با هر صفحه‌کلیدی بتواند تایپ کند */
const toLatin = (s: string) =>
  s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
   .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export type Calendar = "jalali" | "gregorian";
const CAL_KEY = "khanum-calendar";

const GREGORIAN_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];
/** 0=یکشنبه … 6=شنبه */
const GREGORIAN_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function gregorianMonthLength(gy: number, gm: number) {
  return new Date(Date.UTC(gy, gm, 0)).getUTCDate();
}

/** میلادی «2025-04-15» یا «2025/4/15» → ISO، در غیر این صورت null */
function gregorianStringToIso(input: string): string | null {
  const parts = toLatin(input).split(/[^\d]+/).filter(Boolean).map(Number);
  if (parts.length !== 3) return null;
  const [gy, gm, gd] = parts;
  if (gy < 1900 || gy > 2200 || gm < 1 || gm > 12) return null;
  if (gd < 1 || gd > gregorianMonthLength(gy, gm)) return null;
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/**
 * ورودی تاریخ با انتخاب تقویم شمسی یا میلادی.
 * هرچه کاربر انتخاب کند، مقداری که ذخیره می‌شود همیشه میلادی ISO است.
 */
export function DateInput({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label?: string;
  /** تاریخ میلادی به شکل YYYY-MM-DD */
  defaultValue?: string | null;
  required?: boolean;
}) {
  const initialIso = defaultValue ? defaultValue.slice(0, 10) : "";
  const [cal, setCal] = useState<Calendar>("jalali");
  const [iso, setIso] = useState(initialIso);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // تقویم دلخواه کاربر بین همه فیلدها و همه صفحه‌ها مشترک است
  useEffect(() => {
    const saved = localStorage.getItem(CAL_KEY);
    if (saved === "gregorian" || saved === "jalali") setCal(saved);
  }, []);

  // متن نمایشی همیشه از روی مقدار ISO و تقویم فعلی ساخته می‌شود
  useEffect(() => {
    setText(iso ? (cal === "jalali" ? isoToJalaliString(iso) : iso) : "");
    setError(null);
  }, [iso, cal]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function switchCalendar(next: Calendar) {
    setCal(next);
    localStorage.setItem(CAL_KEY, next);
  }

  function commitText(v: string) {
    setText(v);
    if (v.trim() === "") {
      setIso("");
      setError(null);
      return;
    }
    const parsed = cal === "jalali" ? jalaliStringToIso(v) : gregorianStringToIso(v);
    if (parsed) {
      setIso(parsed);
      setError(null);
    } else {
      setError("تاریخ نامعتبر است");
    }
  }

  /* ---------- وضعیت تقویم بازشونده ---------- */

  const tj = todayJalali();
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const parts = iso ? iso.split("-").map(Number) : null;
  const [view, setView] = useState(() => {
    if (parts) {
      const [y, m] = parts;
      const j = toJalali(y, m, parts[2]);
      return { jy: j.jy, jm: j.jm, gy: y, gm: m };
    }
    return { jy: tj.jy, jm: tj.jm, gy: now.getFullYear(), gm: now.getMonth() + 1 };
  });

  // با تغییر مقدار یا تقویم، ماه نمایش‌داده‌شده هم هماهنگ شود
  useEffect(() => {
    if (!iso) return;
    const [y, m, d] = iso.split("-").map(Number);
    const j = toJalali(y, m, d);
    setView({ jy: j.jy, jm: j.jm, gy: y, gm: m });
  }, [iso]);

  function shiftMonth(delta: number) {
    setView((v) => {
      if (cal === "jalali") {
        let { jy, jm } = v;
        jm += delta;
        if (jm < 1) { jm = 12; jy -= 1; }
        else if (jm > 12) { jm = 1; jy += 1; }
        return { ...v, jy, jm };
      }
      let { gy, gm } = v;
      gm += delta;
      if (gm < 1) { gm = 12; gy -= 1; }
      else if (gm > 12) { gm = 1; gy += 1; }
      return { ...v, gy, gm };
    });
  }

  function pick(day: number) {
    if (cal === "jalali") {
      const g = toGregorian(view.jy, view.jm, day);
      setIso(`${g.gy}-${pad(g.gm)}-${pad(g.gd)}`);
    } else {
      setIso(`${view.gy}-${pad(view.gm)}-${pad(day)}`);
    }
    setOpen(false);
  }

  const days = cal === "jalali" ? jalaliMonthLength(view.jy, view.jm) : gregorianMonthLength(view.gy, view.gm);
  const offset =
    cal === "jalali"
      ? jalaliMonthStartWeekday(view.jy, view.jm)
      : new Date(Date.UTC(view.gy, view.gm - 1, 1)).getUTCDay();
  const weekdays = cal === "jalali" ? WEEKDAYS : GREGORIAN_WEEKDAYS;
  const monthTitle =
    cal === "jalali"
      ? `${JALALI_MONTHS[view.jm - 1]} ${view.jy}`
      : `${GREGORIAN_MONTHS[view.gm - 1]} ${view.gy}`;

  function isoOfDay(day: number) {
    if (cal === "jalali") {
      const g = toGregorian(view.jy, view.jm, day);
      return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
    }
    return `${view.gy}-${pad(view.gm)}-${pad(day)}`;
  }

  const placeholder = cal === "jalali" ? "1404/01/01" : "2025-03-21";

  return (
    <div className="w-full" ref={box}>
      {label && <Label required={required}>{label}</Label>}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={text}
          placeholder={placeholder}
          onChange={(e) => commitText(e.target.value)}
          onFocus={() => setOpen(true)}
          /* آیکون سمت راست است و متن از چپ شروع می‌شود، پس تداخلی پیش نمی‌آید */
          className={`${controlBase} ${controlBorder(!!error)} h-10 pr-9 pl-3 text-sm`}
        />
        {/* مقدار واقعی که ذخیره می‌شود همیشه میلادی است */}
        <input type="hidden" name={name} value={iso} />
        {required && (
          <input
            type="text"
            required
            value={iso}
            onChange={() => {}}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 h-0 w-0 opacity-0"
          />
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="باز کردن تقویم"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--geist-radius)] text-[var(--geist-secondary)] transition hover:bg-[var(--geist-gray-100)] hover:text-[var(--geist-foreground)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>

        {open && (
          <div
            style={{ animation: "geist-fade-in 0.12s ease-out" }}
            className="absolute right-0 z-40 mt-1 w-[17.5rem] rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-3 shadow-[var(--geist-shadow)]"
          >
            <div className="mb-2.5 flex justify-center border-b border-[var(--geist-border)] pb-2.5">
              <CalendarSwitch value={cal} onChange={switchCalendar} />
            </div>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="ماه قبل"
                className="flex h-7 w-7 items-center justify-center rounded-[var(--geist-radius)] text-[var(--geist-secondary)] transition hover:bg-[var(--geist-gray-100)]"
              >
                ›
              </button>
              <span className="text-sm font-medium">{monthTitle}</span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="ماه بعد"
                className="flex h-7 w-7 items-center justify-center rounded-[var(--geist-radius)] text-[var(--geist-secondary)] transition hover:bg-[var(--geist-gray-100)]"
              >
                ‹
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {weekdays.map((w) => (
                <span key={w} className="py-1 text-[0.65rem] text-[var(--geist-tertiary)]">
                  {w}
                </span>
              ))}
              {Array.from({ length: offset }).map((_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: days }).map((_, i) => {
                const d = i + 1;
                const dayIso = isoOfDay(d);
                const isSel = iso === dayIso;
                const isToday = todayIso === dayIso;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pick(d)}
                    className={`num flex h-8 items-center justify-center rounded-[var(--geist-radius)] text-xs transition ${
                      isSel
                        ? "bg-[var(--geist-foreground)] font-medium text-[var(--geist-background)]"
                        : isToday
                          ? "bg-[var(--geist-gray-100)] font-medium"
                          : "hover:bg-[var(--geist-gray-100)]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--geist-border)] pt-2">
              <div className="flex gap-1">
                <Button size="tiny" variant="tertiary" onClick={() => setIso(todayIso)}>
                  امروز
                </Button>
                <Button size="tiny" variant="tertiary" onClick={() => setIso("")}>
                  پاک کردن
                </Button>
              </div>
              <span className="num text-[0.65rem] text-[var(--geist-tertiary)]">
                {iso ? (cal === "jalali" ? `میلادی: ${iso}` : `شمسی: ${isoToJalaliString(iso)}`) : ""}
              </span>
            </div>
          </div>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function CalendarSwitch({
  value,
  onChange,
}: {
  value: Calendar;
  onChange: (v: Calendar) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-[var(--geist-border)] p-0.5">
      {(
        [
          ["jalali", "شمسی"],
          ["gregorian", "میلادی"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full px-2 py-0.5 text-[0.65rem] transition ${
            value === key
              ? "bg-[var(--geist-gray-100)] font-medium text-[var(--geist-foreground)]"
              : "text-[var(--geist-tertiary)] hover:text-[var(--geist-foreground)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
