import { randomBytes } from "crypto";
import { sql } from "./db";
import { num } from "./format";
import { itemStatus, paymentStatus, shipmentStatus } from "./queries";

export type Share = {
  id: number;
  token: string;
  created_at: string;
  view_count: number;
  last_viewed_at: string | null;
};

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function activeShare(invoiceId: number): Promise<Share | null> {
  const [row] = await sql`
    select id, token, created_at::text, view_count, last_viewed_at::text
    from invoice_shares where invoice_id = ${invoiceId} and revoked_at is null
  `;
  if (!row) return null;
  return {
    id: Number(row.id),
    token: String(row.token),
    created_at: String(row.created_at),
    view_count: Number(row.view_count),
    last_viewed_at: row.last_viewed_at ? String(row.last_viewed_at) : null,
  };
}

/**
 * محتوای عمومی یک فاکتور.
 * هیچ مبلغی اینجا نیست — مبالغ فقط برای کاربر واردشده جداگانه خوانده می‌شوند.
 */
export type PublicInvoice = {
  invoice_id: number;
  invoice_no: string;
  supplier: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  payment_status: string;
  invoice_status: string;
  payment_count: number;
  last_payment_date: string | null;
  items: {
    id: number;
    sku: string | null;
    description: string | null;
    qty: number;
    allocated: number;
    remaining: number;
    in_transit: number;
    received: number;
    status: string;
  }[];
  shipments: {
    id: number;
    shipment_no: string;
    carrier: string | null;
    mode: string | null;
    tracking_no: string | null;
    handover_date: string | null;
    depart_date: string | null;
    receive_date: string | null;
    transit_days: number | null;
    qty_shipped: number;
    qty_received: number;
    status: string;
  }[];
};

/** مبالغ — فقط وقتی خوانده می‌شود که بیننده وارد سیستم شده باشد */
export type InvoiceMoney = {
  total_amount: number;
  items_total: number;
  paid: number;
  balance: number;
  items: Record<number, { unit_price: number; line_total: number }>;
  freight: Record<number, number>;
};

const iso = (v: unknown) => (v ? String(v).slice(0, 10) : null);

/** فاکتور را با توکن پیدا می‌کند؛ اگر لینک باطل شده باشد null برمی‌گرداند */
export async function invoiceByToken(token: string): Promise<PublicInvoice | null> {
  const [share] = await sql`
    select invoice_id from invoice_shares
    where token = ${token} and revoked_at is null
  `;
  if (!share) return null;
  const invoiceId = Number(share.invoice_id);

  const [inv] = await sql`
    select i.*,
      coalesce((select sum(amount) from payments where invoice_id = i.id), 0) as paid,
      (select count(*)::int from payments where invoice_id = i.id) as payment_count,
      (select max(payment_date)::text from payments where invoice_id = i.id) as last_payment_date
    from invoices i where i.id = ${invoiceId}
  `;
  if (!inv) return null;

  const balance = Math.max(0, num(inv.total_amount) - num(inv.paid));

  const itemRows = await sql`
    select ii.id, ii.sku, ii.description, ii.qty,
      coalesce((select sum(qty_shipped) from allocations where item_id = ii.id), 0)  as allocated,
      coalesce((select sum(qty_received) from allocations where item_id = ii.id), 0) as received
    from invoice_items ii where ii.invoice_id = ${invoiceId} order by ii.id
  `;

  const shipRows = await sql`
    select s.*, sum(a.qty_shipped) as qty_shipped, sum(a.qty_received) as qty_received
    from shipments s
    join allocations a on a.shipment_id = s.id
    join invoice_items ii on ii.id = a.item_id
    where ii.invoice_id = ${invoiceId}
    group by s.id order by s.handover_date nulls last, s.id
  `;

  await sql`
    update invoice_shares set view_count = view_count + 1, last_viewed_at = now()
    where token = ${token}
  `;

  return {
    invoice_id: invoiceId,
    invoice_no: String(inv.invoice_no),
    supplier: (inv.supplier as string | null) ?? null,
    invoice_date: iso(inv.invoice_date),
    due_date: iso(inv.due_date),
    currency: (inv.currency as string | null) ?? null,
    payment_status: paymentStatus(balance, num(inv.paid), iso(inv.due_date)),
    invoice_status: balance <= 0.005 ? "بسته" : "باز",
    payment_count: Number(inv.payment_count),
    last_payment_date: iso(inv.last_payment_date),
    items: itemRows.map((r) => {
      const qty = num(r.qty);
      const allocated = num(r.allocated);
      const received = num(r.received);
      return {
        id: Number(r.id),
        sku: (r.sku as string | null) ?? null,
        description: (r.description as string | null) ?? null,
        qty,
        allocated,
        remaining: Math.max(0, qty - allocated),
        in_transit: Math.max(0, allocated - received),
        received,
        status: itemStatus(qty, allocated, received),
      };
    }),
    shipments: shipRows.map((r) => {
      const handover = iso(r.handover_date);
      const receive = iso(r.receive_date);
      const days =
        handover && receive
          ? Math.round(
              (new Date(receive).getTime() - new Date(handover).getTime()) / 86_400_000
            )
          : null;
      return {
        id: Number(r.id),
        shipment_no: String(r.shipment_no),
        carrier: (r.carrier as string | null) ?? null,
        mode: (r.mode as string | null) ?? null,
        tracking_no: (r.tracking_no as string | null) ?? null,
        handover_date: handover,
        depart_date: iso(r.depart_date),
        receive_date: receive,
        transit_days: days,
        qty_shipped: num(r.qty_shipped),
        qty_received: num(r.qty_received),
        status: shipmentStatus({
          receive_date: receive,
          depart_date: iso(r.depart_date),
          handover_date: handover,
        }),
      };
    }),
  };
}

/** مبالغ همان فاکتور — فقط برای کاربر واردشده صدا زده می‌شود */
export async function invoiceMoney(invoiceId: number): Promise<InvoiceMoney> {
  const [inv] = await sql`
    select i.total_amount,
      coalesce((select sum(amount) from payments where invoice_id = i.id), 0) as paid,
      coalesce((select sum(qty * unit_price) from invoice_items where invoice_id = i.id), 0) as items_total
    from invoices i where i.id = ${invoiceId}
  `;
  const itemRows = await sql`
    select id, qty, unit_price from invoice_items where invoice_id = ${invoiceId}
  `;
  const shipRows = await sql`
    select s.id, s.freight_cost,
      coalesce((select sum(qty_shipped) from allocations where shipment_id = s.id), 0) as total_qty
    from shipments s
    where s.id in (
      select a.shipment_id from allocations a
      join invoice_items ii on ii.id = a.item_id
      where ii.invoice_id = ${invoiceId}
    )
  `;

  const total = num(inv?.total_amount);
  const paid = num(inv?.paid);
  return {
    total_amount: total,
    items_total: num(inv?.items_total),
    paid,
    balance: Math.max(0, total - paid),
    items: Object.fromEntries(
      itemRows.map((r) => [
        Number(r.id),
        { unit_price: num(r.unit_price), line_total: num(r.qty) * num(r.unit_price) },
      ])
    ),
    freight: Object.fromEntries(shipRows.map((r) => [Number(r.id), num(r.freight_cost)])),
  };
}
