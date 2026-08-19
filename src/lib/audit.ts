import { sql } from "./db";
import type { SessionUser } from "./auth";

export type AuditAction = "ایجاد" | "ویرایش" | "حذف" | "ورود داده";

export const ENTITIES = {
  invoice: "فاکتور",
  item: "قلم کالا",
  shipment: "پارت ارسال",
  allocation: "تخصیص به پارت",
  payment: "پرداخت",
  product: "کالا",
  user: "کاربر",
  import: "ورود داده",
} as const;

export type EntityKey = keyof typeof ENTITIES;

/** ثبت یک رویداد در تاریخچه — هرگز نباید اکشن اصلی را با خطا متوقف کند */
export async function logAudit(
  user: SessionUser,
  action: AuditAction,
  entity: EntityKey,
  entityId: number | null,
  summary: string
) {
  try {
    await sql`
      insert into audit_log (user_id, user_name, action, entity, entity_id, summary)
      values (${user.id}, ${`${user.first_name} ${user.last_name}`}, ${action},
              ${entity}, ${entityId}, ${summary})
    `;
  } catch (e) {
    console.error("ثبت تاریخچه ناموفق بود:", e);
  }
}

export async function listAudit(limit = 300, entity?: EntityKey, entityId?: number) {
  const rows =
    entity && entityId
      ? await sql`
          select * from audit_log
          where entity = ${entity} and entity_id = ${entityId}
          order by created_at desc limit ${limit}
        `
      : await sql`select * from audit_log order by created_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: Number(r.id),
    user_name: String(r.user_name),
    action: String(r.action),
    entity: String(r.entity) as EntityKey,
    entity_label: ENTITIES[String(r.entity) as EntityKey] ?? String(r.entity),
    entity_id: r.entity_id === null ? null : Number(r.entity_id),
    summary: String(r.summary),
    created_at: new Date(String(r.created_at)).toISOString(),
  }));
}
