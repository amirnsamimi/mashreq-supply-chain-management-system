/** خواندن و نوشتن وضعیت راهنمای هر کاربر در دیتابیس */

import { sql } from "./db";

export type GuideState = {
  last_step: number;
  seen_count: number;
  started_at: string | null;
  completed_at: string | null;
  skipped: boolean;
};

const EMPTY: GuideState = {
  last_step: 0,
  seen_count: 0,
  started_at: null,
  completed_at: null,
  skipped: false,
};

export async function guideState(userId: number): Promise<GuideState> {
  const rows = await sql`
    select last_step, seen_count, started_at, completed_at, skipped
    from user_guide where user_id = ${userId}
  `;
  if (!rows.length) return EMPTY;
  const r = rows[0];
  return {
    last_step: Number(r.last_step),
    seen_count: Number(r.seen_count),
    started_at: r.started_at ? new Date(r.started_at as string).toISOString() : null,
    completed_at: r.completed_at ? new Date(r.completed_at as string).toISOString() : null,
    skipped: Boolean(r.skipped),
  };
}

/** آیا باید راهنما خودکار برای این کاربر باز شود؟ (ورود اول) */
export async function shouldAutoStart(userId: number): Promise<boolean> {
  const s = await guideState(userId);
  return s.completed_at === null && !s.skipped;
}

/** شروع یا ادامه راهنما — شمارنده دفعات دیدن را یکی زیاد می‌کند */
export async function markGuideStarted(userId: number): Promise<void> {
  await sql`
    insert into user_guide (user_id, seen_count, started_at, updated_at)
    values (${userId}, 1, now(), now())
    on conflict (user_id) do update
      set seen_count = user_guide.seen_count + 1,
          started_at = coalesce(user_guide.started_at, now()),
          updated_at = now()
  `;
}

/** ذخیره آخرین گامی که کاربر دیده است */
export async function saveGuideStep(userId: number, step: number): Promise<void> {
  await sql`
    insert into user_guide (user_id, last_step, updated_at)
    values (${userId}, ${step}, now())
    on conflict (user_id) do update
      set last_step = ${step}, updated_at = now()
  `;
}

/** پایان راهنما — با skipped مشخص می‌شود کاربر تا آخر رفته یا رد کرده */
export async function finishGuide(userId: number, skipped: boolean): Promise<void> {
  await sql`
    insert into user_guide (user_id, completed_at, skipped, updated_at)
    values (${userId}, now(), ${skipped}, now())
    on conflict (user_id) do update
      set completed_at = now(), skipped = ${skipped}, updated_at = now()
  `;
}

/** پاک کردن وضعیت تا راهنما دوباره مثل بار اول خودکار باز شود */
export async function resetGuide(userId: number): Promise<void> {
  await sql`
    insert into user_guide (user_id, last_step, completed_at, skipped, updated_at)
    values (${userId}, 0, null, false, now())
    on conflict (user_id) do update
      set last_step = 0, completed_at = null, skipped = false, updated_at = now()
  `;
}

/** یک فاکتور و یک پارت واقعی، تا راهنما بتواند صفحه‌های داخلی را هم نشان دهد */
export async function guideSamples(): Promise<{
  invoiceId: number | null;
  shipmentId: number | null;
}> {
  const [inv, ship] = await Promise.all([
    sql`select id from invoices order by id desc limit 1`,
    sql`select id from shipments order by id desc limit 1`,
  ]);
  return {
    invoiceId: inv.length ? Number(inv[0].id) : null,
    shipmentId: ship.length ? Number(ship[0].id) : null,
  };
}
