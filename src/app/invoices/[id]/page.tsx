import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  getInvoice,
  listAllocationsForItem,
  listItems,
  listPayments,
  listProducts,
  listShipments,
} from "@/lib/queries";
import { listAudit } from "@/lib/audit";
import { money, jalali } from "@/lib/format";
import { Page } from "@/components/Nav";
import { Badge, Card, Stat } from "@/components/geist";
import { statusTone } from "@/lib/tones";
import { InvoiceEditCard, ItemShipmentsCard, ItemsCard } from "./InvoiceDetail";
import { InvoicePaymentsCard } from "./InvoicePayments";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAuth();
  const id = Number((await params).id);
  const inv = await getInvoice(id);
  if (!inv) notFound();

  const items = await listItems(id);
  const payments = await listPayments(id);
  const shipments = await listShipments();
  const products = await listProducts();
  const history = await listAudit(15, "invoice", id);
  const allocsByItem = Object.fromEntries(
    await Promise.all(
      items.map(async (it) => [it.id, await listAllocationsForItem(it.id)] as const)
    )
  );
  const cur = inv.currency ?? "";

  return (
    <Page
      active="/invoices"
      user={`${me.first_name} ${me.last_name}`}
      title={
        <span className="flex flex-wrap items-center gap-3">
          فاکتور {inv.invoice_no}
          <Badge tone={statusTone(inv.payment_status)}>{inv.payment_status}</Badge>
          <Badge tone={statusTone(inv.invoice_status)}>{inv.invoice_status}</Badge>
        </span>
      }
      action={
        <Link href="/invoices" className="text-sm text-[var(--geist-secondary)] hover:underline">
          ← بازگشت به فهرست
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={`مبلغ کل (${cur})`} value={money(inv.total_amount)} />
        <Stat
          label={`جمع مبلغ اقلام (${cur})`}
          value={money(inv.items_total)}
          hint={`${items.length} قلم`}
        />
        <Stat
          label={`اختلاف فاکتور و اقلام (${cur})`}
          value={money(inv.diff)}
          tone={Math.abs(inv.diff) > 0.01 ? "warn" : "good"}
        />
        <Stat
          label={`جمع پرداختی (${cur})`}
          value={money(inv.paid)}
          tone="good"
          hint={inv.last_payment_date ? `آخرین: ${jalali(inv.last_payment_date)}` : undefined}
        />
        <Stat
          label={`مانده (${cur})`}
          value={money(inv.balance)}
          tone={inv.balance > 0 ? "warn" : "good"}
        />
      </div>

      <div className="mt-6">
        <ItemsCard
          invoiceId={id}
          items={items}
          products={products}
          shipments={shipments.map((s) => ({
            id: s.id,
            shipment_no: s.shipment_no,
            carrier: s.carrier,
            status: s.status,
          }))}
        />
      </div>

      <div className="mt-6">
        <ItemShipmentsCard items={items} allocsByItem={allocsByItem} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <InvoicePaymentsCard
          invoiceId={id}
          invoiceNo={inv.invoice_no}
          payments={payments}
          balance={inv.balance}
          currency={cur}
        />
        <InvoiceEditCard inv={inv} />
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <Card title="تاریخچه این فاکتور">
            <ul className="divide-y divide-[var(--geist-border)]">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge tone={statusTone(h.action)}>{h.action}</Badge>
                  <span>{h.summary}</span>
                  <span className="mr-auto text-xs text-[var(--geist-tertiary)]">
                    {h.user_name} — {jalali(h.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </Page>
  );
}
