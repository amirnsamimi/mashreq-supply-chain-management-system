import type { BadgeTone } from "@/components/geist/Feedback";

const map: Record<string, BadgeTone> = {
  "تسویه‌شده": "green",
  "بخشی پرداخت‌شده": "amber",
  "سررسید گذشته": "red",
  "پرداخت‌نشده": "gray",
  "باز": "blue",
  "بسته": "gray",
  "تحویل‌شده": "green",
  "در مسیر": "blue",
  "تحویل به کارگو": "purple",
  "در انتظار تحویل به کارگو": "gray",
  "کاملاً دریافت‌شده": "green",
  "کامل ارسال‌شده": "blue",
  "بخشی ارسال‌شده": "amber",
  "ارسال‌نشده": "gray",
  "فعال": "green",
  "غیرفعال": "gray",
  "ایجاد": "green",
  "ویرایش": "blue",
  "حذف": "red",
  "ورود داده": "purple",
  "کم‌فروش": "gray",
};

export function statusTone(status: string): BadgeTone {
  return map[status] ?? "gray";
}
