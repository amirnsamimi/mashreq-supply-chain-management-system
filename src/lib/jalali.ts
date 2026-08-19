/**
 * تبدیل تاریخ شمسی و میلادی — بدون وابستگی خارجی.
 * الگوریتم استاندارد (Borkowski) که تا سال ۱۵۰۰ شمسی دقیق است.
 */

/** تقسیم صحیح با گرد کردن به سمت صفر — برای اعداد منفی با Math.floor فرق دارد */
const div = (a: number, b: number) => Math.trunc(a / b);

const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;

  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ += div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(j % 1461, 4) * 5 + 308;
  const gd = div(i % 153, 5) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** شمسی → میلادی */
export function toGregorian(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  const jdn =
    g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  return d2g(jdn);
}

/** میلادی → شمسی */
export function toJalali(gy: number, gm: number, gd: number) {
  const jdn = g2d(gy, gm, gd);
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: (k % 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: (k % 30) + 1 };
}

/** تعداد روزهای یک ماه شمسی */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29;
}

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2025-04-15" → "1404/01/26" */
export function isoToJalaliString(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const j = toJalali(y, m, d);
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

/** "1404/01/26" یا "۱۴۰۴-۱-۲۶" → "2025-04-15" (در صورت نامعتبر بودن، null) */
export function jalaliStringToIso(input: string): string | null {
  const latin = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const parts = latin.split(/[^\d]+/).filter(Boolean).map(Number);
  if (parts.length !== 3) return null;
  const [jy, jm, jd] = parts;
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12) return null;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

/** شمسیِ امروز */
export function todayJalali() {
  const now = new Date();
  return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** روز هفته ۰..۶ (شنبه=۰) برای اول ماه شمسی */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const g = toGregorian(jy, jm, 1);
  const dow = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay(); // ۰=یکشنبه
  return (dow + 1) % 7; // ۰=شنبه
}
