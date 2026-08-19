"use client";

import { useEffect } from "react";

/**
 * ارتفاع واقعی نوار ثابت را روی --nav-h می‌گذارد.
 * چون نوار در موبایل دو ردیفه و در دسکتاپ یک‌ردیفه می‌شود،
 * اندازه‌اش با تغییر عرض صفحه عوض می‌شود.
 */
export function NavHeight() {
  useEffect(() => {
    const nav = document.querySelector(".app-nav");
    if (!nav) return;

    const apply = () => {
      const h = Math.round(nav.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(nav);
    window.addEventListener("orientationchange", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  return null;
}
