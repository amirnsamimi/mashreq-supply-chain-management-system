import { sql } from "./db";
import { num } from "./format";

export type PaymentStatus = "تسویه‌شده" | "بخشی پرداخت‌شده" | "سررسید گذشته" | "پرداخت‌نشده";
export type ItemStatus = "کاملاً دریافت‌شده" | "کامل ارسال‌شده" | "بخشی ارسال‌شده" | "ارسال‌نشده";
export type ShipmentStatus = "تحویل‌شده" | "در مسیر" | "تحویل به کارگو" | "در انتظار تحویل به کارگو";

/** ستون تاریخ را — چه Date چه رشته — به YYYY-MM-DD تبدیل می‌کند */
function d(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function paymentStatus(balance: number, paid: number, dueDate: string | null): PaymentStatus {
  if (balance <= 0.005) return "تسویه‌شده";
  if (paid > 0) return "بخشی پرداخت‌شده";
  if (dueDate && dueDate < today()) return "سررسید گذشته";
  return "پرداخت‌نشده";
}

export function itemStatus(qty: number, allocated: number, received: number): ItemStatus {
  if (qty > 0 && received >= qty) return "کاملاً دریافت‌شده";
  if (qty > 0 && allocated >= qty) return "کامل ارسال‌شده";
  if (allocated > 0) return "بخشی ارسال‌شده";
  return "ارسال‌نشده";
}

export function shipmentStatus(r: {
  receive_date: string | null;
  depart_date: string | null;
  handover_date: string | null;
}): ShipmentStatus {
  if (r.receive_date) return "تحویل‌شده";
  if (r.depart_date) return "در مسیر";
  if (r.handover_date) return "تحویل به کارگو";
  return "در انتظار تحویل به کارگو";
}

/* ---------- فاکتورها ---------- */

const invoiceSelect = sql`
  select i.*,
    coalesce(it.items_total, 0)  as items_total,
    coalesce(it.items_count, 0)  as items_count,
    coalesce(p.paid, 0)          as paid,
    p.last_payment_date
  from invoices i
  left join lateral (
    select sum(qty * unit_price) as items_total, count(*) as items_count
    from invoice_items where invoice_id = i.id
  ) it on true
  left join lateral (
    select sum(amount) as paid, max(payment_date)::text as last_payment_date
    from payments where invoice_id = i.id
  ) p on true
`;

export type InvoiceRow = {
  id: number;
  invoice_no: string;
  supplier: string | null;
  invoice_date: string | null;
  currency: string | null;
  due_date: string | null;
  notes: string | null;
};

function shapeInvoice(r: Record<string, unknown>) {
  const total = num(r.total_amount);
  const itemsTotal = num(r.items_total);
  const paid = num(r.paid);
  const balance = Math.max(0, total - paid);
  return {
    id: r.id as number,
    invoice_no: r.invoice_no as string,
    supplier: (r.supplier as string | null) ?? null,
    invoice_date: d(r.invoice_date),
    currency: (r.currency as string | null) ?? null,
    due_date: d(r.due_date),
    notes: (r.notes as string | null) ?? null,
    total_amount: total,
    items_total: itemsTotal,
    diff: total - itemsTotal,
    paid,
    balance,
    items_count: num(r.items_count),
    last_payment_date: d(r.last_payment_date),
    payment_status: paymentStatus(balance, paid, d(r.due_date)),
    invoice_status: balance <= 0.005 ? "بسته" : "باز",
  };
}

export type Invoice = ReturnType<typeof shapeInvoice>;

export async function listInvoices(): Promise<Invoice[]> {
  const rows = await sql`${invoiceSelect} order by i.invoice_no`;
  return rows.map(shapeInvoice);
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const rows = await sql`${invoiceSelect} where i.id = ${id}`;
  return rows.length ? shapeInvoice(rows[0]) : null;
}

/* ---------- اقلام ---------- */

function shapeItem(r: Record<string, unknown>) {
  const q = num(r.qty);
  const unitPrice = num(r.unit_price);
  const allocated = num(r.allocated);
  const received = num(r.received);
  const freightShare = num(r.freight_share);
  const unitFreight = allocated > 0 ? freightShare / allocated : 0;
  return {
    id: r.id as number,
    invoice_id: r.invoice_id as number,
    sku: (r.sku as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    qty: q,
    unit_price: unitPrice,
    line_total: q * unitPrice,
    allocated,
    remaining: Math.max(0, q - allocated),
    received,
    in_transit: Math.max(0, allocated - received),
    freight_share: freightShare,
    unit_freight: unitFreight,
    landed_unit_cost: unitPrice + unitFreight,
    status: itemStatus(q, allocated, received),
  };
}

export type Item = ReturnType<typeof shapeItem>;

/** اقلام یک فاکتور همراه با تخصیص و سهم هزینه حمل */
export async function listItems(invoiceId: number): Promise<Item[]> {
  const rows = await sql`
    select ii.*,
      coalesce(a.allocated, 0)     as allocated,
      coalesce(a.received, 0)      as received,
      coalesce(a.freight_share, 0) as freight_share
    from invoice_items ii
    left join lateral (
      select
        sum(al.qty_shipped)  as allocated,
        sum(al.qty_received) as received,
        sum(
          case when st.total_qty > 0
            then al.qty_shipped / st.total_qty * st.freight_cost
            else 0 end
        ) as freight_share
      from allocations al
      join (
        select s.id, s.freight_cost,
               coalesce((select sum(qty_shipped) from allocations where shipment_id = s.id), 0) as total_qty
        from shipments s
      ) st on st.id = al.shipment_id
      where al.item_id = ii.id
    ) a on true
    where ii.invoice_id = ${invoiceId}
    order by ii.id
  `;
  return rows.map(shapeItem);
}

/* ---------- پارت‌های ارسال ---------- */

function shapeShipment(r: Record<string, unknown>) {
  const totalQty = num(r.total_qty);
  const freight = num(r.freight_cost);
  const handover = d(r.handover_date);
  const receive = d(r.receive_date);
  let days: number | null = null;
  if (handover && receive) {
    days = Math.round(
      (new Date(receive).getTime() - new Date(handover).getTime()) / 86_400_000
    );
  }
  return {
    id: r.id as number,
    shipment_no: r.shipment_no as string,
    carrier: (r.carrier as string | null) ?? null,
    mode: (r.mode as string | null) ?? null,
    tracking_no: (r.tracking_no as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    weight_kg: (r.weight_kg as string | null) ?? null,
    cbm: (r.cbm as string | null) ?? null,
    invoice_nos: (r.invoice_nos as string | null) ?? "",
    handover_date: handover,
    depart_date: d(r.depart_date),
    receive_date: receive,
    freight_cost: freight,
    total_qty: totalQty,
    received_qty: num(r.received_qty),
    freight_per_unit: totalQty > 0 ? freight / totalQty : 0,
    transit_days: days,
    status: shipmentStatus({
      receive_date: receive,
      depart_date: d(r.depart_date),
      handover_date: handover,
    }),
  };
}

export type Shipment = ReturnType<typeof shapeShipment>;

const shipmentSelect = sql`
  select s.*,
    coalesce(a.total_qty, 0)    as total_qty,
    coalesce(a.received_qty, 0) as received_qty,
    coalesce(a.invoice_nos, '') as invoice_nos
  from shipments s
  left join lateral (
    select sum(al.qty_shipped) as total_qty,
           sum(al.qty_received) as received_qty,
           string_agg(distinct i.invoice_no, '، ') as invoice_nos
    from allocations al
    join invoice_items ii on ii.id = al.item_id
    join invoices i on i.id = ii.invoice_id
    where al.shipment_id = s.id
  ) a on true
`;

export async function listShipments(): Promise<Shipment[]> {
  const rows = await sql`${shipmentSelect} order by s.shipment_no`;
  return rows.map(shapeShipment);
}

export async function getShipment(id: number): Promise<Shipment | null> {
  const rows = await sql`${shipmentSelect} where s.id = ${id}`;
  return rows.length ? shapeShipment(rows[0]) : null;
}

/* ---------- تخصیص‌ها ---------- */

export async function listAllocationsForShipment(shipmentId: number) {
  const rows = await sql`
    select al.*, ii.sku, ii.description, ii.qty as item_qty, ii.unit_price,
           i.invoice_no, i.id as invoice_id
    from allocations al
    join invoice_items ii on ii.id = al.item_id
    join invoices i on i.id = ii.invoice_id
    where al.shipment_id = ${shipmentId}
    order by al.id
  `;
  return rows.map((r) => ({
    id: r.id as number,
    item_id: r.item_id as number,
    invoice_id: r.invoice_id as number,
    invoice_no: r.invoice_no as string,
    sku: (r.sku as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    qty_shipped: num(r.qty_shipped),
    qty_received: num(r.qty_received),
    item_qty: num(r.item_qty),
    variance: num(r.qty_shipped) - num(r.qty_received),
  }));
}

export async function listAllocationsForItem(itemId: number) {
  const rows = await sql`
    select al.*, s.shipment_no, s.carrier, s.mode, s.receive_date, s.id as shipment_id
    from allocations al
    join shipments s on s.id = al.shipment_id
    where al.item_id = ${itemId}
    order by al.id
  `;
  return rows.map((r) => ({
    id: r.id as number,
    shipment_id: r.shipment_id as number,
    shipment_no: r.shipment_no as string,
    carrier: (r.carrier as string | null) ?? null,
    mode: (r.mode as string | null) ?? null,
    receive_date: d(r.receive_date),
    qty_shipped: num(r.qty_shipped),
    qty_received: num(r.qty_received),
  }));
}

export async function listPayments(invoiceId: number) {
  const rows = await sql`
    select * from payments where invoice_id = ${invoiceId} order by payment_date nulls last, id
  `;
  return rows.map((r) => ({
    id: r.id as number,
    payment_date: d(r.payment_date),
    method: (r.method as string | null) ?? null,
    reference: (r.reference as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    amount: num(r.amount),
  }));
}

/** اقلام باز (تخصیص‌نیافته) برای فرم افزودن تخصیص */
export async function listOpenItems() {
  const rows = await sql`
    select ii.id, ii.sku, ii.description, ii.qty, i.invoice_no,
           coalesce((select sum(qty_shipped) from allocations where item_id = ii.id), 0) as allocated
    from invoice_items ii
    join invoices i on i.id = ii.invoice_id
    order by i.invoice_no, ii.id
  `;
  return rows.map((r) => ({
    id: r.id as number,
    sku: r.sku as string | null,
    description: r.description as string | null,
    invoice_no: r.invoice_no as string,
    qty: num(r.qty),
    allocated: num(r.allocated),
    remaining: Math.max(0, num(r.qty) - num(r.allocated)),
  }));
}

/* ---------- داشبورد ---------- */

export async function dashboard() {
  const invoices = await listInvoices();
  const shipments = await listShipments();
  const [it] = await sql`select count(*)::int as items from invoice_items`;

  // جمع مبالغ باید به تفکیک ارز باشد؛ جمع کردن RMB و USD با هم بی‌معناست
  const byCurrency = new Map<string, { total: number; paid: number; balance: number }>();
  for (const i of invoices) {
    const cur = i.currency ?? "—";
    const acc = byCurrency.get(cur) ?? { total: 0, paid: 0, balance: 0 };
    acc.total += i.total_amount;
    acc.paid += i.paid;
    acc.balance += i.balance;
    byCurrency.set(cur, acc);
  }

  return {
    invoices: invoices.length,
    items: num(it.items),
    currencies: [...byCurrency.entries()]
      .map(([currency, v]) => ({ currency, ...v }))
      .sort((a, b) => b.total - a.total),
    shipments: shipments.length,
    inTransit: shipments.filter((s) => s.status === "در مسیر").length,
    atCarrier: shipments.filter((s) => s.status === "تحویل به کارگو").length,
    delivered: shipments.filter((s) => s.status === "تحویل‌شده").length,
    freight: shipments.reduce((s, x) => s + x.freight_cost, 0),
    overdue: invoices.filter((i) => i.payment_status === "سررسید گذشته").length,
    openInvoices: invoices.filter((i) => i.invoice_status === "باز").length,
  };
}

/* ---------- کالاها ---------- */

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  last_price: number | null;
  notes: string | null;
  is_active: boolean;
  invoice_count: number;
  total_qty: number;
};

export async function listProducts(): Promise<Product[]> {
  const rows = await sql`
    select p.*,
      coalesce(u.invoice_count, 0) as invoice_count,
      coalesce(u.total_qty, 0)     as total_qty
    from products p
    left join lateral (
      select count(distinct ii.invoice_id) as invoice_count, sum(ii.qty) as total_qty
      from invoice_items ii where ii.product_id = p.id
    ) u on true
    order by p.sku
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    sku: String(r.sku),
    name: String(r.name),
    category: (r.category as string | null) ?? null,
    unit: (r.unit as string | null) ?? null,
    last_price: r.last_price === null ? null : num(r.last_price),
    notes: (r.notes as string | null) ?? null,
    is_active: Boolean(r.is_active),
    invoice_count: num(r.invoice_count),
    total_qty: num(r.total_qty),
  }));
}

/* ---------- پرداخت‌ها (همه فاکتورها) ---------- */

export type PaymentRow = {
  id: number;
  invoice_id: number;
  invoice_no: string;
  supplier: string | null;
  currency: string | null;
  payment_date: string | null;
  amount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
};

export async function listAllPayments(): Promise<PaymentRow[]> {
  const rows = await sql`
    select p.*, i.invoice_no, i.supplier, i.currency
    from payments p
    join invoices i on i.id = p.invoice_id
    order by p.payment_date desc nulls last, p.id desc
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    invoice_id: Number(r.invoice_id),
    invoice_no: String(r.invoice_no),
    supplier: (r.supplier as string | null) ?? null,
    currency: (r.currency as string | null) ?? null,
    payment_date: d(r.payment_date),
    amount: num(r.amount),
    method: (r.method as string | null) ?? null,
    reference: (r.reference as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  }));
}
