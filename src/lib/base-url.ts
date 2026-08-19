import { headers } from "next/headers";

/**
 * آدرس پایه برنامه برای ساختن لینک‌های عمومی.
 * اول از APP_URL خوانده می‌شود؛ اگر تعریف نشده باشد از هدرهای درخواست
 * ساخته می‌شود (پشت پروکسی هم درست کار می‌کند).
 */
export async function baseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
