import { createHash } from "crypto";
import ExcelJS from "exceljs";
import { sql } from "./db";
import type { SessionUser } from "./auth";

type Tx = Parameters<Parameters<typeof sql.begin>[1]>[0] | typeof sql;

/**
 * جدول‌های داده کسب‌وکار — همان‌هایی که «حذف همه داده‌ها» پاک می‌کند.
 * کاربران، تاریخچه، قالب‌های اعلان و اشتراک‌های پوش جزو این فهرست نیستند و دست نمی‌خورند.
 */
export const DATA_TABLES = [
  { table: "suppliers", label: "تأمین‌کنندگان" },
  { table: "products", label: "کالاها" },
  { table: "invoices", label: "فاکتورها" },
  { table: "invoice_items", label: "اقلام فاکتور" },
  { table: "shipments", label: "پارت‌های ارسال" },
  { table: "allocations", label: "تخصیص اقلام به پارت" },
  { table: "payments", label: "پرداخت‌ها و شارژهای کیف‌پول" },
  { table: "payment_allocations", label: "تسویه فاکتورها" },
  { table: "supplier_credits", label: "دفتر کیف‌پول تأمین‌کنندگان" },
  { table: "invoice_shares", label: "لینک‌های اشتراک فاکتور" },
  { table: "notifications", label: "اعلان‌ها" },
] as const;

/** جدول‌هایی که فقط در فایل پشتیبان می‌آیند و هرگز پاک نمی‌شوند */
const KEPT_TABLES = [
  { table: "notification_rules", label: "قالب‌های اعلان", columns: "*" },
  { table: "users", label: "کاربران (بدون رمز)", columns: "id, phone, first_name, last_name, role, permissions, is_active, created_at" },
  { table: "audit_log", label: "تاریخچه تغییرات", columns: "*" },
] as const;

const STATE_KEY = "data_backup";

export type BackupStatus = {
  lastBackupAt: string | null;
  lastBackupBy: string | null;
  /** آیا از آخرین پشتیبان تا الان هیچ داده‌ای تغییر نکرده؟ فقط در این حالت حذف مجاز است */
  upToDate: boolean;
  counts: { table: string; label: string; rows: number }[];
  totalRows: number;
};

/**
 * اثرانگشت محتوای همه جدول‌های داده: تعداد ردیف و هش کل ردیف‌ها.
 * هر ایجاد، ویرایش یا حذف پس از پشتیبان‌گیری آن را عوض می‌کند.
 */
export async function dataFingerprint(tx: Tx = sql) {
  const counts: Record<string, number> = {};
  const hash = createHash("sha256");
  for (const { table } of DATA_TABLES) {
    const [r] = await tx.unsafe(
      `select count(*)::int as n, coalesce(md5(string_agg(t::text, '|' order by t.id)), '') as h from ${table} t`
    );
    counts[table] = Number(r.n);
    hash.update(`${table}:${r.n}:${r.h};`);
  }
  return { counts, fingerprint: hash.digest("hex") };
}

type StoredBackup = { at: string; by: string; fingerprint: string };

async function readStored(): Promise<StoredBackup | null> {
  const [row] = await sql`select value from app_state where key = ${STATE_KEY}`;
  if (!row?.value) return null;
  try {
    return JSON.parse(String(row.value)) as StoredBackup;
  } catch {
    return null;
  }
}

export async function recordBackup(user: SessionUser, fingerprint: string) {
  const value = JSON.stringify({
    at: new Date().toISOString(),
    by: `${user.first_name} ${user.last_name}`,
    fingerprint,
  } satisfies StoredBackup);
  await sql`
    insert into app_state (key, value, updated_at) values (${STATE_KEY}, ${value}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const [stored, current] = await Promise.all([readStored(), dataFingerprint()]);
  const counts = DATA_TABLES.map(({ table, label }) => ({ table, label, rows: current.counts[table] ?? 0 }));
  return {
    lastBackupAt: stored?.at ?? null,
    lastBackupBy: stored?.by ?? null,
    upToDate: !!stored && stored.fingerprint === current.fingerprint,
    counts,
    totalRows: counts.reduce((s, c) => s + c.rows, 0),
  };
}

export async function storedFingerprint(): Promise<string | null> {
  return (await readStored())?.fingerprint ?? null;
}

/* ---------- ساخت فایل اکسل پشتیبان ---------- */

const NUMERIC_OIDS = new Set([20, 21, 23, 700, 701, 1700]);

function toCell(value: unknown, typeOid: number): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  if (NUMERIC_OIDS.has(typeOid) && typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

/**
 * همه جدول‌ها را در یک تراکنش فقط‌خواندنی با یک عکس لحظه‌ای ثابت می‌خواند
 * تا فایل و اثرانگشت دقیقاً مربوط به یک لحظه باشند.
 */
export async function buildBackupWorkbook(user: SessionUser) {
  return sql.begin("isolation level repeatable read read only", async (tx) => {
    const { fingerprint } = await dataFingerprint(tx);
    const takenAt = new Date().toISOString();

    const wb = new ExcelJS.Workbook();
    wb.creator = "اپلیکیشن مشرقی";
    const guide = wb.addWorksheet("راهنما", { views: [{ rightToLeft: true }] });
    guide.columns = [
      { header: "شیت", width: 24 },
      { header: "محتوا", width: 34 },
      { header: "تعداد ردیف", width: 14 },
      { header: "با حذف همه داده‌ها پاک می‌شود؟", width: 28 },
    ];
    guide.getRow(1).font = { bold: true };

    const tables = [
      ...DATA_TABLES.map((t) => ({ ...t, columns: "*", wiped: true })),
      ...KEPT_TABLES.map((t) => ({ ...t, wiped: false })),
    ];

    for (const t of tables) {
      const rows = await tx.unsafe(`select ${t.columns} from ${t.table} order by id`);
      const ws = wb.addWorksheet(t.table, { views: [{ state: "frozen", ySplit: 1 }] });
      const cols = rows.columns ?? [];
      ws.columns = cols.map((c) => ({ header: c.name, key: c.name, width: Math.max(12, c.name.length + 4) }));
      ws.getRow(1).font = { bold: true };
      for (const r of rows) {
        ws.addRow(cols.map((c) => toCell((r as Record<string, unknown>)[c.name], c.type)));
      }
      guide.addRow([t.table, t.label, rows.length, t.wiped ? "بله" : "خیر"]);
    }

    guide.addRow([]);
    guide.addRow(["زمان پشتیبان‌گیری (UTC)", takenAt]);
    guide.addRow(["گرفته‌شده توسط", `${user.first_name} ${user.last_name}`]);
    guide.addRow(["اثرانگشت داده", fingerprint]);

    const buffer = await wb.xlsx.writeBuffer();
    return { buffer, fingerprint, takenAt };
  });
}
