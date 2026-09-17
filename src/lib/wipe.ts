/** عبارت تأیید «حذف همه داده‌ها» — بدون وابستگی به دیتابیس تا کلاینت هم بتواند واردش کند */
export const WIPE_PHRASE = "حذف همه داده‌ها";

/** نیم‌فاصله، فاصله اضافه و «ی/ک» عربی نباید باعث رد عبارت تأیید شوند */
export function normalizePhrase(s: string) {
  return s.replace(/‌/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}
