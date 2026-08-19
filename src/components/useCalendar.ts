"use client";

import { useEffect, useState } from "react";

export type Calendar = "jalali" | "gregorian";

/**
 * تقویم انتخابی کاربر را می‌خواند و با تغییرش دوباره رندر می‌کند.
 * برای جاهایی لازم است که CSS کارساز نیست — مثل برچسب‌های روی canvas نمودار.
 */
export function useCalendar(): Calendar {
  const [cal, setCal] = useState<Calendar>("jalali");

  useEffect(() => {
    const read = (): Calendar =>
      document.documentElement.getAttribute("data-calendar") === "gregorian"
        ? "gregorian"
        : "jalali";
    setCal(read());

    const observer = new MutationObserver(() => setCal(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-calendar"],
    });
    return () => observer.disconnect();
  }, []);

  return cal;
}
