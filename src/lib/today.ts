/**
 * «امروز» باید در منطقه زمانی کسب‌وکار حساب شود، نه UTC.
 * سرورها معمولاً روی UTC اجرا می‌شوند و تهران +۳:۳۰ است، پس بین
 * ۲۰:۳۰ تا نیمه‌شب، تاریخ UTC هنوز روز قبل است و محاسبه سررسید یک روز غلط می‌شود.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Tehran";

// en-CA همیشه YYYY-MM-DD می‌دهد
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** تاریخ امروز به وقت کسب‌وکار، به شکل YYYY-MM-DD */
export function todayISO(now: Date = new Date()): string {
  return dayFmt.format(now);
}

/** نیمه‌شب امروز به وقت کسب‌وکار، برای مقایسه اختلاف روز */
export function todayMs(now: Date = new Date()): number {
  return new Date(todayISO(now) + "T00:00:00Z").getTime();
}

/** فاصله روز تا یک تاریخ ISO — مثبت یعنی گذشته */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso.slice(0, 10) + "T00:00:00Z").getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((todayMs() - t) / 86_400_000);
}
