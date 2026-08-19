import { isoToJalaliString } from "@/lib/jalali";

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * تاریخ را هم‌زمان به شمسی و میلادی در DOM می‌گذارد و با CSS
 * فقط یکی را نشان می‌دهد — بر اساس data-calendar روی <html>.
 * این‌طور نه جاوااسکریپت لازم است نه ناهماهنگی hydration پیش می‌آید.
 */
export function DateText({
  value,
  withTime = false,
  fallback = "—",
}: {
  value: string | Date | null | undefined;
  withTime?: boolean;
  fallback?: string;
}) {
  if (!value) return <>{fallback}</>;

  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return <>{fallback}</>;

  const iso = d.toISOString().slice(0, 10);
  const clock = withTime
    ? ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <>
      <span className="cal-jalali">
        {faDigits(isoToJalaliString(iso))}
        {faDigits(clock)}
      </span>
      <span className="cal-gregorian">
        {iso}
        {clock}
      </span>
    </>
  );
}
