import { toGregorian, toJalali, JALALI_MONTHS } from "./jalali";

const faDigits = (n: number | string) =>
  String(n).replace(/\d/g, (d) => "0123456789"[Number(d)]);
import {
  listAllPayments,
  listInvoices,
  listItems,
  listShipments,
  listSuppliers,
} from "./queries";

export type Bucket = { label: string; value: number };

const GREGORIAN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const monthKey = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const j = toJalali(y, m, d);
  return { key: `${j.jy}-${String(j.jm).padStart(2, "0")}` };
};

/** آخرین n ماه شمسی به ترتیب، با برچسب در هر دو تقویم */
function lastMonths(n: number) {
  const now = new Date();
  const t = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const out: { key: string; jalali: string; gregorian: string }[] = [];
  let jy = t.jy;
  let jm = t.jm;
  for (let i = 0; i < n; i++) {
    // ماه شمسی روی دو ماه میلادی می‌افتد؛ برچسب میلادی را از میانه ماه می‌گیریم
    const g = toGregorian(jy, jm, 15);
    out.unshift({
      key: `${jy}-${String(jm).padStart(2, "0")}`,
      jalali: `${JALALI_MONTHS[jm - 1]} ${jy}`,
      gregorian: `${GREGORIAN_SHORT[g.gm - 1]} ${g.gy}`,
    });
    jm -= 1;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    }
  }
  return out;
}

export type ReportData = {
  currencies: string[];
  months: { jalali: string; gregorian: string }[];
  purchasesByMonth: number[];
  paymentsByMonth: number[];
  freightByMonth: number[];
  aging: Bucket[];
  topSuppliers: Bucket[];
  topProducts: Bucket[];
  shipmentStatus: Bucket[];
  shipmentModes: Bucket[];
  outstandingBySupplier: Bucket[];
  itemsPipeline: Bucket[];
  shippedByMonth: number[];
  receivedByMonth: number[];
  carriers: {
    carrier: string;
    shipments: number;
    avgTransit: number | null;
    completeRate: number | null;
    freight: number;
  }[];
  totals: {
    invoices: number;
    purchases: number;
    paid: number;
    balance: number;
    overdue: number;
    freight: number;
    freightShare: number;
    avgTransit: number | null;
    onTimeRate: number | null;
    avgDaysToPay: number | null;
    suppliers: number;
    products: number;
    shipments: number;
    itemsCount: number;
  };
};

/** همه اعداد گزارش برای یک ارز مشخص */
export async function buildReport(currency: string, monthCount = 12): Promise<ReportData> {
  const allInvoices = await listInvoices();
  const currencies = [...new Set(allInvoices.map((i) => i.currency ?? "—"))].sort();
  const invoices = allInvoices.filter((i) => (i.currency ?? "—") === currency);
  const invoiceIds = new Set(invoices.map((i) => i.id));

  const payments = (await listAllPayments()).filter((p) => invoiceIds.has(p.invoice_id));
  const shipments = await listShipments();
  const suppliers = await listSuppliers();

  const months = lastMonths(monthCount);
  const zero = () => Object.fromEntries(months.map((m) => [m.key, 0])) as Record<string, number>;

  /* خرید و پرداخت به تفکیک ماه */
  const purchases = zero();
  for (const inv of invoices) {
    if (!inv.invoice_date) continue;
    const k = monthKey(inv.invoice_date).key;
    if (k in purchases) purchases[k] += inv.total_amount;
  }
  const paid = zero();
  for (const p of payments) {
    if (!p.payment_date) continue;
    const k = monthKey(p.payment_date).key;
    if (k in paid) paid[k] += p.amount;
  }

  /* هزینه حمل به تفکیک ماه — بر اساس تاریخ تحویل به کارگو */
  const freight = zero();
  for (const s of shipments) {
    const date = s.handover_date ?? s.depart_date;
    if (!date) continue;
    const k = monthKey(date).key;
    if (k in freight) freight[k] += s.freight_cost;
  }

  /* سنی‌سازی بدهی */
  const todayMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const agingBuckets = [
    { label: "سررسید نشده", min: -Infinity, max: 0 },
    { label: "1 تا 30 روز", min: 1, max: 30 },
    { label: "31 تا 60 روز", min: 31, max: 60 },
    { label: "بیش از 60 روز", min: 61, max: Infinity },
  ];
  const aging = agingBuckets.map((b) => ({ label: b.label, value: 0 }));
  for (const inv of invoices) {
    if (inv.balance <= 0.005) continue;
    if (!inv.due_date) {
      aging[0].value += inv.balance;
      continue;
    }
    const days = Math.round((todayMs - new Date(inv.due_date).getTime()) / 86_400_000);
    const idx = agingBuckets.findIndex((b) => days >= b.min && days <= b.max);
    aging[idx < 0 ? 0 : idx].value += inv.balance;
  }

  /* تأمین‌کنندگان و کالاهای برتر */
  const supplierTotals = new Map<string, number>();
  for (const inv of invoices) {
    const name = inv.supplier ?? "بدون تأمین‌کننده";
    supplierTotals.set(name, (supplierTotals.get(name) ?? 0) + inv.total_amount);
  }
  const topSuppliers = [...supplierTotals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const productTotals = new Map<string, number>();
  for (const inv of invoices) {
    for (const it of await listItems(inv.id)) {
      const label = it.sku ?? it.description ?? "—";
      productTotals.set(label, (productTotals.get(label) ?? 0) + it.line_total);
    }
  }
  const topProducts = [...productTotals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  /* پارت‌ها — مستقل از ارز، چون هزینه حملشان ارز فاکتور را ندارد */
  const statusOrder = ["در انتظار تحویل به کارگو", "تحویل به کارگو", "در مسیر", "تحویل‌شده"];
  const shipmentStatus = statusOrder.map((label) => ({
    label,
    value: shipments.filter((s) => s.status === label).length,
  }));
  const modeTotals = new Map<string, number>();
  for (const s of shipments) {
    const label = s.mode ?? "نامشخص";
    modeTotals.set(label, (modeTotals.get(label) ?? 0) + 1);
  }
  const shipmentModes = [...modeTotals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const transitDays = shipments.map((s) => s.transit_days).filter((d): d is number => d !== null);
  const delivered = shipments.filter((s) => s.status === "تحویل‌شده");
  const complete = delivered.filter((s) => s.received_qty >= s.total_qty - 0.0005);

  /* مانده بدهی به تفکیک تأمین‌کننده */
  const balanceBySupplier = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.balance <= 0.005) continue;
    const name = inv.supplier ?? "بدون تأمین‌کننده";
    balanceBySupplier.set(name, (balanceBySupplier.get(name) ?? 0) + inv.balance);
  }
  const outstandingBySupplier = [...balanceBySupplier.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  /* چرخه کالا: ارسال‌نشده / در مسیر / دریافت‌شده — بر حسب تعداد */
  let notShipped = 0;
  let inTransit = 0;
  let received = 0;
  let itemsCount = 0;
  for (const inv of invoices) {
    for (const it of await listItems(inv.id)) {
      itemsCount++;
      notShipped += it.remaining;
      inTransit += it.in_transit;
      received += it.received;
    }
  }
  const itemsPipeline = [
    { label: "ارسال‌نشده", value: notShipped },
    { label: "در مسیر", value: inTransit },
    { label: "دریافت‌شده", value: received },
  ];

  /* تعداد ارسالی و دریافتی به تفکیک ماه */
  const shippedM = zero();
  const receivedM = zero();
  for (const s of shipments) {
    const outKey = s.depart_date ?? s.handover_date;
    if (outKey) {
      const k = monthKey(outKey).key;
      if (k in shippedM) shippedM[k] += s.total_qty;
    }
    if (s.receive_date) {
      const k = monthKey(s.receive_date).key;
      if (k in receivedM) receivedM[k] += s.received_qty;
    }
  }

  /* کارنامه کارگوها */
  const byCarrier = new Map<string, typeof shipments>();
  for (const s of shipments) {
    const name = s.carrier ?? "نامشخص";
    byCarrier.set(name, [...(byCarrier.get(name) ?? []), s]);
  }
  const carriers = [...byCarrier.entries()]
    .map(([carrier, list]) => {
      const days = list.map((s) => s.transit_days).filter((d): d is number => d !== null);
      const done = list.filter((s) => s.status === "تحویل‌شده");
      const full = done.filter((s) => s.received_qty >= s.total_qty - 0.0005);
      return {
        carrier,
        shipments: list.length,
        avgTransit: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
        completeRate: done.length ? (full.length / done.length) * 100 : null,
        freight: list.reduce((a, s) => a + s.freight_cost, 0),
      };
    })
    .sort((a, b) => b.shipments - a.shipments);

  /* میانگین روزهای تا پرداخت */
  const payLags: number[] = [];
  for (const p of payments) {
    if (!p.payment_date) continue;
    const inv = invoices.find((i) => i.id === p.invoice_id);
    if (!inv?.invoice_date) continue;
    const lag = Math.round(
      (new Date(p.payment_date).getTime() - new Date(inv.invoice_date).getTime()) / 86_400_000
    );
    if (lag >= 0) payLags.push(lag);
  }

  const purchasesTotal = invoices.reduce((s, i) => s + i.total_amount, 0);
  const freightTotal = shipments.reduce((s, x) => s + x.freight_cost, 0);

  return {
    currencies,
    months: months.map((m) => ({ jalali: m.jalali, gregorian: m.gregorian })),
    purchasesByMonth: months.map((m) => purchases[m.key]),
    paymentsByMonth: months.map((m) => paid[m.key]),
    freightByMonth: months.map((m) => freight[m.key]),
    aging,
    topSuppliers,
    topProducts,
    shipmentStatus,
    shipmentModes,
    outstandingBySupplier,
    itemsPipeline,
    shippedByMonth: months.map((m) => shippedM[m.key]),
    receivedByMonth: months.map((m) => receivedM[m.key]),
    carriers,
    totals: {
      invoices: invoices.length,
      purchases: purchasesTotal,
      paid: invoices.reduce((s, i) => s + i.paid, 0),
      balance: invoices.reduce((s, i) => s + i.balance, 0),
      overdue: invoices.filter((i) => i.payment_status === "سررسید گذشته").length,
      freight: freightTotal,
      freightShare: purchasesTotal > 0 ? (freightTotal / purchasesTotal) * 100 : 0,
      avgTransit: transitDays.length
        ? Math.round(transitDays.reduce((a, b) => a + b, 0) / transitDays.length)
        : null,
      onTimeRate: delivered.length ? (complete.length / delivered.length) * 100 : null,
      avgDaysToPay: payLags.length
        ? Math.round(payLags.reduce((a, b) => a + b, 0) / payLags.length)
        : null,
      suppliers: suppliers.length,
      products: [...new Set(topProducts.map((p) => p.label))].length,
      shipments: shipments.length,
      itemsCount,
    },
  };
}

export async function reportCurrencies(): Promise<string[]> {
  const invoices = await listInvoices();
  const set = [...new Set(invoices.map((i) => i.currency ?? "—"))].sort();
  return set.length ? set : ["RMB"];
}

export async function supplierCount() {
  return (await listSuppliers()).length;
}
