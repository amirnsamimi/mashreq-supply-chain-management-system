"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "./auth";
import { logAudit } from "./audit";
import { DATA_TABLES, dataFingerprint, storedFingerprint } from "./backup";
import { sql } from "./db";
import { WIPE_PHRASE, normalizePhrase } from "./wipe";

export type WipeResult = { ok: boolean; message: string } | null;

class StaleBackup extends Error {}

export async function wipeAllData(_prev: WipeResult, fd: FormData): Promise<WipeResult> {
  const me = await requirePermission("import");
  if (me.role !== "admin") return { ok: false, message: "فقط ادمین می‌تواند همه داده‌ها را حذف کند" };

  if (normalizePhrase(String(fd.get("phrase") ?? "")) !== normalizePhrase(WIPE_PHRASE)) {
    return { ok: false, message: `برای تأیید، عبارت «${WIPE_PHRASE}» را دقیقاً بنویسید` };
  }

  const expected = await storedFingerprint();
  if (!expected) return { ok: false, message: "اول از داده‌ها پشتیبان بگیرید" };

  const tables = DATA_TABLES.map((t) => t.table).join(", ");
  let removed = 0;
  try {
    await sql.begin(async (tx) => {
      // تا پایان تراکنش هیچ‌کس نمی‌تواند در این جدول‌ها بنویسد
      await tx.unsafe(`lock table ${tables} in exclusive mode`);
      const current = await dataFingerprint(tx);
      if (current.fingerprint !== expected) throw new StaleBackup();
      removed = Object.values(current.counts).reduce((a, b) => a + b, 0);
      // بدون CASCADE: اگر جدول دیگری به این‌ها وابسته باشد، به‌جای پاک‌کردن بی‌صدا خطا می‌دهد
      await tx.unsafe(`truncate table ${tables} restart identity`);
    });
  } catch (e) {
    if (e instanceof StaleBackup) {
      return {
        ok: false,
        message: "داده‌ها پس از آخرین پشتیبان تغییر کرده‌اند. دوباره پشتیبان بگیرید و بعد حذف کنید.",
      };
    }
    throw e;
  }

  await logAudit(me, "حذف", "backup", null, `حذف همه داده‌ها (${removed} ردیف) پس از پشتیبان‌گیری`);
  for (const path of ["/", "/suppliers", "/products", "/invoices", "/shipments", "/payments", "/reports", "/notifications", "/import"]) {
    revalidatePath(path);
  }
  return { ok: true, message: `همه داده‌ها حذف شد (${removed} ردیف). کاربران، تاریخچه و قالب‌های اعلان دست نخوردند.` };
}
