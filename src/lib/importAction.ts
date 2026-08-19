"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "./auth";
import { importWorkbook, type ImportReport } from "./import";

const MAX_SIZE = 15 * 1024 * 1024;

export async function importAction(
  _prev: ImportReport | null,
  fd: FormData
): Promise<ImportReport> {
  const me = await requireAuth();
  const empty = { counts: {}, warnings: [] };
  const file = fd.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "فایلی انتخاب نشده است", ...empty };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, message: "حجم فایل نباید از ۱۵ مگابایت بیشتر باشد", ...empty };
  }

  const report = await importWorkbook(me, file.name, await file.arrayBuffer());
  if (report.ok) {
    for (const path of ["/", "/products", "/invoices", "/shipments", "/payments", "/history"]) {
      revalidatePath(path);
    }
  }
  return report;
}
