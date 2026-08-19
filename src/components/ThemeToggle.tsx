"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "khanum-theme";

/** data-theme را روی <html> ست می‌کند؛ «system» یعنی هیچ صفتی نگذار */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme, ready]);

  const options: { key: Theme; label: string; icon: React.ReactNode }[] = [
    { key: "light", label: "روشن", icon: <SunIcon /> },
    { key: "dark", label: "تیره", icon: <MoonIcon /> },
    { key: "system", label: "سیستم", icon: <SystemIcon /> },
  ];

  return (
    <div
      role="group"
      aria-label="حالت نمایش"
      className="flex items-center gap-0.5 rounded-full border border-[var(--geist-border)] p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          title={o.label}
          aria-label={o.label}
          aria-pressed={ready && theme === o.key}
          onClick={() => setTheme(o.key)}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
            ready && theme === o.key
              ? "bg-[var(--geist-gray-100)] text-[var(--geist-foreground)]"
              : "text-[var(--geist-tertiary)] hover:text-[var(--geist-foreground)]"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

const svg = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function SunIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...svg}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg {...svg}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
