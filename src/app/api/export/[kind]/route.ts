import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listAudit } from "@/lib/audit";
import { isoToJalaliString } from "@/lib/jalali";
import {
  listInvoices,
  listItems,
  listShipments,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/** «480.000» → «480» تا اعداد در اکسل تمیز دربیایند */
function trim(v: unknown): unknown {
  if (typeof v === "string" && /^-?\d+\.\d+$/.test(v)) {
    const t = v.replace(/0+$/, "").replace(/\.$/, "");
    return t === "" || t === "-" ? "0" : t;
  }
  return v;
}

/** یک سلول CSV را ایمن می‌کند و از تزریق فرمول در اکسل جلوگیری می‌کند */
function cell(value: unknown): string {
  const v = trim(value);
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function csv(headers: string[], rows: unknown[][]): string {
  const body = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
  return "﻿" + body; // BOM تا اکسل فارسی را درست بخواند
}

const jd = (iso: string | null) => (iso ? isoToJalaliString(iso.slice(0, 10)) : "");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const user = await currentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { kind } = await params;
  let filename = kind;
  let content = "";

  if (kind === "invoices") {
    const rows = await listInvoices();
    content = csv(
      ["شماره فاکتور","فروشنده","تاریخ فاکتور","ارز","مبلغ کل","جمع اقلام","اختلاف","جمع پرداختی","مانده","تاریخ سررسید","آخرین پرداخت","وضعیت پرداخت","وضعیت فاکتور","توضیحات"],
      rows.map((r) => [r.invoice_no, r.supplier, jd(r.invoice_date), r.currency, r.total_amount, r.items_total, r.diff, r.paid, r.balance, jd(r.due_date), jd(r.last_payment_date), r.payment_status, r.invoice_status, r.notes])
    );
    filename = "فاکتورها";
  } else if (kind === "items") {
    const invoiceId = req.nextUrl.searchParams.get("invoice");
    const invoices = await listInvoices();
    const targets = invoiceId ? invoices.filter((i) => i.id === Number(invoiceId)) : invoices;
    const rows: unknown[][] = [];
    for (const inv of targets) {
      for (const it of await listItems(inv.id)) {
        rows.push([inv.invoice_no, it.sku, it.description, it.qty, it.unit_price, it.line_total, it.allocated, it.remaining, it.in_transit, it.received, it.unit_freight, it.landed_unit_cost, it.status]);
      }
    }
    content = csv(
      ["شماره فاکتور","کد کالا","شرح کالا","تعداد","قیمت واحد","مبلغ کل","تخصیص‌یافته","باقی‌مانده","در مسیر","دریافت‌شده","حمل هر واحد","بهای تمام‌شده","وضعیت"],
      rows
    );
    filename = "اقلام-فاکتور";
  } else if (kind === "shipments") {
    const rows = await listShipments();
    content = csv(
      ["شماره پارت","فاکتورها","کارگو","نوع حمل","شماره رهگیری","تحویل به کارگو","تاریخ خروج","تاریخ دریافت","مدت حمل (روز)","تعداد کالا","دریافت‌شده","هزینه حمل","حمل هر واحد","وزن (کیلو)","حجم CBM","وضعیت","توضیحات"],
      rows.map((r) => [r.shipment_no, r.invoice_nos, r.carrier, r.mode, r.tracking_no, jd(r.handover_date), jd(r.depart_date), jd(r.receive_date), r.transit_days, r.total_qty, r.received_qty, r.freight_cost, r.freight_per_unit, r.weight_kg, r.cbm, r.status, r.notes])
    );
    filename = "پارت-های-ارسال";
  } else if (kind === "allocations") {
    const rows = await sql`
      select i.invoice_no, s.shipment_no, ii.sku, ii.description,
             a.qty_shipped, a.qty_received, s.freight_cost,
             coalesce((select sum(qty_shipped) from allocations where shipment_id = s.id), 0) as ship_qty
      from allocations a
      join invoice_items ii on ii.id = a.item_id
      join invoices i on i.id = ii.invoice_id
      join shipments s on s.id = a.shipment_id
      order by s.shipment_no, i.invoice_no
    `;
    content = csv(
      ["شماره فاکتور","شماره پارت","کد کالا","شرح کالا","تعداد ارسال‌شده","تعداد دریافت‌شده","مغایرت","سهم هزینه حمل"],
      rows.map((r) => {
        const shipQty = Number(r.ship_qty);
        const share = shipQty > 0 ? (Number(r.qty_shipped) / shipQty) * Number(r.freight_cost) : 0;
        return [r.invoice_no, r.shipment_no, r.sku, r.description, r.qty_shipped, r.qty_received, Number(r.qty_shipped) - Number(r.qty_received), share.toFixed(2)];
      })
    );
    filename = "تخصیص-اقلام";
  } else if (kind === "payments") {
    const rows = await sql`
      select i.invoice_no, i.currency, p.payment_date::text, p.amount, p.method, p.reference, p.notes
      from payments p join invoices i on i.id = p.invoice_id
      order by p.payment_date nulls last, p.id
    `;
    content = csv(
      ["شماره فاکتور","ارز","تاریخ پرداخت","مبلغ","روش","مرجع/رسید","توضیحات"],
      rows.map((r) => [r.invoice_no, r.currency, jd(r.payment_date as string), r.amount, r.method, r.reference, r.notes])
    );
    filename = "پرداخت-ها";
  } else if (kind === "history") {
    const rows = await listAudit(5000);
    content = csv(
      ["زمان","کاربر","عملیات","نوع","شرح"],
      rows.map((r) => [
        `${jd(r.created_at)} ${new Date(r.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`,
        r.user_name, r.action, r.entity_label, r.summary,
      ])
    );
    filename = "تاریخچه";
  } else {
    return new Response("not found", { status: 404 });
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
