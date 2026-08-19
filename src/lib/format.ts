/**
 * همه اعداد برنامه با رقم لاتین و جداکننده هزارگان نمایش داده می‌شوند.
 * دلیلش یکدستی است: اعداد فارسی روی canvas نمودار و در فیلدهای ورودی
 * وارونه یا ناهماهنگ رندر می‌شدند.
 */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function money(v: unknown): string {
  return nf.format(num(v));
}

export function qty(v: unknown): string {
  return nf.format(num(v));
}

/** تاریخ شمسی با رقم لاتین: 1404/05/28 → 1404/05/28 */
const jalaliFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

export function jalali(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return jalaliFmt.format(d);
}

/** مقدار date از پایگاه داده را برای input[type=date] آماده می‌کند */
export function isoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
