const fa = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function money(v: unknown): string {
  return fa.format(num(v));
}

export function qty(v: unknown): string {
  return fa.format(num(v));
}

/** تاریخ ISO را به شمسی نمایش می‌دهد */
export function jalali(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** مقدار date از پایگاه داده را برای input[type=date] آماده می‌کند */
export function isoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
