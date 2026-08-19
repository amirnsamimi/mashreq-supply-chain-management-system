"use client";

import { useEffect, useState } from "react";

type Calendar = "jalali" | "gregorian";
const KEY = "khanum-calendar";

/** انتخاب تقویم نمایش — همان کلیدی که ورودی‌های تاریخ هم استفاده می‌کنند */
export function CalendarToggle() {
  const [cal, setCal] = useState<Calendar>("jalali");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "gregorian" || saved === "jalali") setCal(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-calendar", cal);
    localStorage.setItem(KEY, cal);
  }, [cal, ready]);

  return (
    <button
      type="button"
      onClick={() => setCal(cal === "jalali" ? "gregorian" : "jalali")}
      title={cal === "jalali" ? "نمایش تاریخ‌ها به میلادی" : "نمایش تاریخ‌ها به شمسی"}
      aria-label="تغییر تقویم نمایش"
      className="num rounded-full border border-[var(--geist-border)] px-2 py-1 text-[0.65rem] leading-none text-[var(--geist-secondary)] transition hover:border-[var(--geist-foreground)] hover:text-[var(--geist-foreground)]"
    >
      {ready ? (cal === "jalali" ? "۱۴۰۴" : "2025") : "۱۴۰۴"}
    </button>
  );
}
