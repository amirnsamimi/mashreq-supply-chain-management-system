import "server-only";

import { sql } from "./db";
import type { Severity } from "./notification-types";

/**
 * ارسال وب‌پوش.
 *
 * روی iOS فقط وقتی کار می‌کند که برنامه از «افزودن به صفحه اصلی» نصب شده باشد
 * و سایت روی HTTPS باشد. اگر کلیدهای VAPID تعریف نشده باشند، همه‌چیز بی‌صدا
 * غیرفعال می‌شود تا نبودشان جلوی کار برنامه را نگیرد.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
// mailto یا آدرس سایت؛ سرویس‌های پوش برای تماس در زمان مشکل می‌خواهندش
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

/**
 * true یعنی کلیدها هست و می‌شود پوش فرستاد.
 * فقط متغیرهای محیطی را نگاه می‌کند و هیچ ماژولی بار نمی‌کند، تا صفحه‌ای
 * که صرفاً وضعیت را می‌پرسد کتابخانه پوش را وارد نکند.
 */
export function pushEnabled(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

let configured = false;

/**
 * web-push فقط در لحظه ارسال بار می‌شود.
 * این کتابخانه CommonJS است و require‌های داخلی دارد؛ وارد کردنش در بالای
 * فایل باعث می‌شد هر صفحه‌ای که این ماژول را import می‌کند آن را هم بکشد.
 */
async function loadWebPush() {
  const mod = await import("web-push");
  const webpush = mod.default ?? mod;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return webpush;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** ثبت یا به‌روزرسانی اشتراک یک دستگاه */
export async function saveSubscription(
  userId: number,
  sub: PushSubscriptionInput,
  userAgent?: string
) {
  await sql`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${userAgent ?? null})
    on conflict (endpoint) do update
      set user_id = excluded.user_id,
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_agent = excluded.user_agent
  `;
}

export async function removeSubscription(endpoint: string) {
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
}

/** آیا این دستگاه از قبل ثبت شده است؟ */
export async function hasSubscription(endpoint: string): Promise<boolean> {
  const [row] = await sql`select 1 as ok from push_subscriptions where endpoint = ${endpoint}`;
  return Boolean(row);
}

export type PushPayload = {
  title: string;
  body: string;
  severity?: Severity;
  /** آدرسی که با کلیک روی اعلان باز می‌شود */
  url?: string;
  /** اعلان‌های هم‌تگ روی گوشی جای هم را می‌گیرند */
  tag?: string;
};

/**
 * ارسال به همه دستگاه‌های ثبت‌شده.
 * اشتراک‌های باطل (۴۰۴/۴۱۰) خودکار پاک می‌شوند تا جدول تمیز بماند.
 */
export async function sendToAll(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!pushEnabled()) return { sent: 0, removed: 0 };

  const rows = await sql`select endpoint, p256dh, auth from push_subscriptions`;
  if (rows.length === 0) return { sent: 0, removed: 0 };

  const webpush = await loadWebPush();

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (r) => {
      const endpoint = String(r.endpoint);
      try {
        await webpush.sendNotification(
          { endpoint, keys: { p256dh: String(r.p256dh), auth: String(r.auth) } },
          body,
          { TTL: 60 * 60 * 24 }
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removeSubscription(endpoint);
          removed++;
        }
        // خطاهای دیگر (قطعی موقت سرویس پوش) نادیده گرفته می‌شوند
      }
    })
  );

  if (sent > 0) {
    await sql`update push_subscriptions set last_sent_at = now()`;
  }
  return { sent, removed };
}
