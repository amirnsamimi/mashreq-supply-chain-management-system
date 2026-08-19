import ExcelJS from "exceljs";
import { sql } from "./db";
import type { SessionUser } from "./auth";
import { logAudit } from "./audit";
import { jalaliStringToIso } from "./jalali";

export type ImportReport = {
  ok: boolean;
  message: string;
  counts: Record<string, number>;
  warnings: string[];
};

/* نام شیت‌ها و ستون‌های فایل اکسل اصلی */
const SHEETS = {
  products: "کالاها",
  invoices: "فاکتورها",
  items: "اقلام فاکتور",
  shipments: "پارت‌های ارسال",
  allocations: "تخصیص اقلام به ارسال",
  payments: "پرداخت‌ها",
};

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .replace(/‌/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** یک شیت را به آرایه‌ای از شیء‌های کلید-مقدار (بر اساس سطر اول) تبدیل می‌کند */
function sheetRows(ws: ExcelJS.Worksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = normalizeHeader(cell.value);
  });

  const out: Record<string, unknown>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    let empty = true;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (!key) return;
      let v: unknown = cell.value;
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        // سلول فرمول‌دار: مقدار محاسبه‌شده را برمی‌داریم
        if ("result" in o) v = o.result;
        else if ("text" in o) v = o.text;
        else if ("richText" in o)
          v = (o.richText as { text: string }[]).map((t) => t.text).join("");
      }
      if (v !== null && v !== undefined && String(v).trim() !== "") empty = false;
      obj[key] = v;
    });
    if (!empty) out.push(obj);
  });
  return out;
}

/**
 * مقدار یک ستون را با هر یک از نام‌های ممکن برمی‌گرداند.
 * هر دو طرف نرمال می‌شوند تا نیم‌فاصله و فاصله اضافه مشکلی ایجاد نکند.
 */
function pick(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (key in row) return row[key];
  }
  return undefined;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[,٬\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** تاریخ را از سلول اکسل (میلادی، شمسی متنی یا سریال) بیرون می‌کشد */
function date(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);

  const s = String(v).trim();
  // شمسی: سال چهار رقمی ۱۳xx یا ۱۴xx
  if (/^[۰-۹0-9]{4}[^\d][۰-۹0-9]{1,2}[^\d][۰-۹0-9]{1,2}$/.test(s)) {
    const first = parseInt(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).slice(0, 4), 10);
    if (first > 1200 && first < 1600) return jalaliStringToIso(s);
    if (first > 1900 && first < 2200) {
      const parts = s.split(/[^\d]/).map(Number);
      return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * فایل اکسل را می‌خواند و داده‌ها را وارد می‌کند.
 * رکوردهای تکراری (شماره فاکتور/پارت موجود) به‌روزرسانی نمی‌شوند و رد می‌شوند.
 */
export async function importWorkbook(
  me: SessionUser,
  fileName: string,
  data: ArrayBuffer
): Promise<ImportReport> {
  const counts: Record<string, number> = {
    کالا: 0, فاکتور: 0, "قلم کالا": 0, "پارت ارسال": 0, تخصیص: 0, پرداخت: 0,
  };
  const warnings: string[] = [];

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    return { ok: false, message: "فایل خوانده نشد؛ مطمئن شوید فرمت .xlsx است", counts, warnings };
  }

  const find = (name: string) =>
    wb.worksheets.find((w) => normalizeHeader(w.name) === normalizeHeader(name));

  /* ---- کالاها ---- */
  const productIdBySku = new Map<string, number>();
  const wsProducts = find(SHEETS.products);
  if (wsProducts) {
    for (const r of sheetRows(wsProducts)) {
      const sku = text(pick(r, "کد کالا/SKU", "کد کالا", "SKU"));
      if (!sku) continue;
      const existing = await sql`select id from products where sku = ${sku}`;
      if (existing.length) {
        productIdBySku.set(sku, Number(existing[0].id));
        continue;
      }
      const [row] = await sql`
        insert into products (sku, name, category, unit, last_price, notes)
        values (${sku}, ${text(pick(r, "نام کالا")) ?? sku}, ${text(pick(r, "دسته"))},
                ${text(pick(r, "واحد"))}, ${num(pick(r, "آخرین قیمت واحد"))}, ${text(pick(r, "توضیحات"))})
        returning id
      `;
      productIdBySku.set(sku, Number(row.id));
      counts["کالا"]++;
    }
  }

  for (const r of await sql`select id, sku from products`) {
    if (!productIdBySku.has(String(r.sku))) productIdBySku.set(String(r.sku), Number(r.id));
  }

  /** کالایی که در شیت کالاها نبوده ولی در اقلام آمده، خودکار ساخته می‌شود */
  async function ensureProduct(sku: string, name: string | null, price: number | null) {
    const known = productIdBySku.get(sku);
    if (known) return known;
    const [row] = await sql`
      insert into products (sku, name, last_price)
      values (${sku}, ${name ?? sku}, ${price})
      on conflict (sku) do update set sku = excluded.sku
      returning id
    `;
    productIdBySku.set(sku, Number(row.id));
    counts["کالا"]++;
    return Number(row.id);
  }

  /* ---- فاکتورها ---- */
  const invoiceIdByNo = new Map<string, number>();
  const wsInv = find(SHEETS.invoices);
  if (wsInv) {
    for (const r of sheetRows(wsInv)) {
      const no = text(pick(r, "شماره فاکتور"));
      if (!no) continue;
      const existing = await sql`select id from invoices where invoice_no = ${no}`;
      if (existing.length) {
        invoiceIdByNo.set(no, Number(existing[0].id));
        warnings.push(`فاکتور ${no} از قبل وجود داشت و دست‌نخورده ماند`);
        continue;
      }
      const [row] = await sql`
        insert into invoices (invoice_no, supplier, invoice_date, currency, total_amount, due_date, notes)
        values (${no}, ${text(pick(r, "فروشنده"))}, ${date(pick(r, "تاریخ فاکتور"))},
                ${text(pick(r, "ارز")) ?? "RMB"}, ${num(pick(r, "مبلغ کل فاکتور")) ?? 0},
                ${date(pick(r, "تاریخ سررسید"))}, ${text(pick(r, "توضیحات"))})
        returning id
      `;
      invoiceIdByNo.set(no, Number(row.id));
      counts["فاکتور"]++;
    }
  } else {
    warnings.push(`شیت «${SHEETS.invoices}» پیدا نشد`);
  }

  // فاکتورهای موجود در پایگاه داده هم باید قابل ارجاع باشند
  for (const r of await sql`select id, invoice_no from invoices`) {
    if (!invoiceIdByNo.has(String(r.invoice_no)))
      invoiceIdByNo.set(String(r.invoice_no), Number(r.id));
  }

  /* ---- اقلام ---- */
  const itemIdByKey = new Map<string, number>();
  const wsItems = find(SHEETS.items);
  if (wsItems) {
    for (const r of sheetRows(wsItems)) {
      const invNo = text(pick(r, "شماره فاکتور"));
      if (!invNo) continue;
      const invoiceId = invoiceIdByNo.get(invNo);
      if (!invoiceId) {
        warnings.push(`قلم با فاکتور ${invNo} رد شد چون این فاکتور وجود ندارد`);
        continue;
      }
      const sku = text(pick(r, "کد کالا/SKU", "کد کالا", "SKU"));
      if (!sku) {
        warnings.push(`قلمی در فاکتور ${invNo} بدون کد کالا بود و رد شد`);
        continue;
      }
      const price = num(pick(r, "قیمت واحد")) ?? 0;
      const dupItem = await sql`
        select id from invoice_items where invoice_id = ${invoiceId} and sku = ${sku}
      `;
      if (dupItem.length) {
        itemIdByKey.set(`${invNo}|${sku}`, Number(dupItem[0].id));
        warnings.push(`قلم ${sku} در فاکتور ${invNo} از قبل وجود داشت و دست‌نخورده ماند`);
        continue;
      }
      const productId = await ensureProduct(sku, text(pick(r, "شرح کالا")), price);
      const [product] = await sql`select name from products where id = ${productId}`;
      const [row] = await sql`
        insert into invoice_items (invoice_id, product_id, sku, description, qty, unit_price, notes)
        values (${invoiceId}, ${productId}, ${sku}, ${text(pick(r, "شرح کالا")) ?? String(product?.name ?? sku)},
                ${num(pick(r, "تعداد فاکتور", "تعداد")) ?? 0}, ${price}, ${text(pick(r, "توضیحات"))})
        returning id
      `;
      counts["قلم کالا"]++;
      itemIdByKey.set(`${invNo}|${sku}`, Number(row.id));
    }
  }

  /* ---- پارت‌های ارسال ---- */
  const shipmentIdByNo = new Map<string, number>();
  const wsShip = find(SHEETS.shipments);
  if (wsShip) {
    for (const r of sheetRows(wsShip)) {
      const no = text(pick(r, "شماره پارت ارسال", "شماره پارت"));
      if (!no) continue;
      const existing = await sql`select id from shipments where shipment_no = ${no}`;
      if (existing.length) {
        shipmentIdByNo.set(no, Number(existing[0].id));
        warnings.push(`پارت ${no} از قبل وجود داشت و دست‌نخورده ماند`);
        continue;
      }
      const [row] = await sql`
        insert into shipments (shipment_no, carrier, mode, tracking_no, handover_date,
                               depart_date, receive_date, freight_cost, weight_kg, cbm, notes)
        values (${no}, ${text(pick(r, "نام کارگو"))}, ${text(pick(r, "نوع حمل"))}, ${text(pick(r, "شماره رهگیری"))},
                ${date(pick(r, "تاریخ تحویل به کارگو"))}, ${date(pick(r, "تاریخ خروج"))}, ${date(pick(r, "تاریخ دریافت"))},
                ${num(pick(r, "هزینه حمل پارت")) ?? 0}, ${num(pick(r, "وزن (کیلو)", "وزن"))}, ${num(pick(r, "حجم CBM", "CBM"))},
                ${text(pick(r, "توضیحات"))})
        returning id
      `;
      shipmentIdByNo.set(no, Number(row.id));
      counts["پارت ارسال"]++;
    }
  }

  for (const r of await sql`select id, shipment_no from shipments`) {
    if (!shipmentIdByNo.has(String(r.shipment_no)))
      shipmentIdByNo.set(String(r.shipment_no), Number(r.id));
  }

  /* ---- تخصیص اقلام به پارت ---- */
  const wsAlloc = find(SHEETS.allocations);
  if (wsAlloc) {
    for (const r of sheetRows(wsAlloc)) {
      const invNo = text(pick(r, "شماره فاکتور"));
      const shipNo = text(pick(r, "شماره پارت ارسال", "شماره پارت"));
      const sku = text(pick(r, "کد کالا/SKU", "کد کالا", "SKU"));
      const shipped = num(pick(r, "تعداد ارسال‌شده در این پارت", "تعداد ارسال‌شده")) ?? 0;
      if (!invNo || !shipNo || !sku || shipped <= 0) continue;

      const itemId = itemIdByKey.get(`${invNo}|${sku}`);
      const shipmentId = shipmentIdByNo.get(shipNo);
      if (!itemId || !shipmentId) {
        warnings.push(`تخصیص ${invNo}/${sku} به پارت ${shipNo} رد شد چون کالا یا پارت پیدا نشد`);
        continue;
      }
      const [cap] = await sql`
        select ii.qty - coalesce((
          select sum(qty_shipped) from allocations
          where item_id = ii.id and shipment_id <> ${shipmentId}
        ), 0) as remaining
        from invoice_items ii where ii.id = ${itemId}
      `;
      if (shipped > Number(cap?.remaining ?? 0) + 0.0005) {
        warnings.push(
          `تخصیص ${shipped} عدد ${sku} به پارت ${shipNo} رد شد؛ فقط ${cap?.remaining ?? 0} عدد باقی مانده بود`
        );
        continue;
      }
      await sql`
        insert into allocations (item_id, shipment_id, qty_shipped, qty_received)
        values (${itemId}, ${shipmentId}, ${shipped},
                ${num(pick(r, "تعداد دریافت‌شده از این پارت", "تعداد دریافت‌شده")) ?? 0})
        on conflict (item_id, shipment_id) do update
          set qty_shipped = excluded.qty_shipped, qty_received = excluded.qty_received
      `;
      counts["تخصیص"]++;
    }
  }

  /* ---- پرداخت‌ها ---- */
  const wsPay = find(SHEETS.payments);
  if (wsPay) {
    for (const r of sheetRows(wsPay)) {
      const invNo = text(pick(r, "شماره فاکتور"));
      const amount = num(pick(r, "مبلغ پرداخت", "مبلغ"));
      if (!invNo || !amount) continue;
      const invoiceId = invoiceIdByNo.get(invNo);
      if (!invoiceId) {
        warnings.push(`پرداخت فاکتور ${invNo} رد شد چون این فاکتور وجود ندارد`);
        continue;
      }
      const payDate = date(pick(r, "تاریخ پرداخت"));
      const reference = text(pick(r, "مرجع/رسید"));
      const dupPay = await sql`
        select id from payments
        where invoice_id = ${invoiceId} and amount = ${amount}
          and payment_date is not distinct from ${payDate}
          and reference is not distinct from ${reference}
      `;
      if (dupPay.length) {
        warnings.push(`پرداخت ${amount} فاکتور ${invNo} از قبل ثبت شده بود و دوباره اضافه نشد`);
        continue;
      }
      await sql`
        insert into payments (invoice_id, payment_date, amount, method, reference, notes)
        values (${invoiceId}, ${payDate}, ${amount},
                ${text(pick(r, "روش پرداخت"))}, ${reference}, ${text(pick(r, "توضیحات"))})
      `;
      counts["پرداخت"]++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const summary = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join("، ");

  await logAudit(me, "ورود داده", "import", null, `از فایل ${fileName}: ${summary || "بدون رکورد"}`);

  return {
    ok: total > 0,
    message: total > 0 ? `وارد شد: ${summary}` : "هیچ رکورد جدیدی پیدا نشد",
    counts,
    warnings: warnings.slice(0, 50),
  };
}
