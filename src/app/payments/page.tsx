import { requirePermission } from "@/lib/auth";
import { PAYMENT_SORTS, listInvoices, listPaymentsPaged } from "@/lib/queries";
import { parseParams } from "@/lib/paging";
import { money } from "@/lib/format";
import { Page } from "@/components/Nav";
import { Stat } from "@/components/geist";
import { NewPaymentTrigger, PaymentsClient } from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("payments");
  const params = parseParams(await searchParams, PAYMENT_SORTS, "payment_date");
  const payments = await listPaymentsPaged(params);
  const invoices = await listInvoices();

  // جمع‌ها به تفکیک ارز، چون جمع کردن ارزهای مختلف بی‌معناست
  const byCurrency = new Map<string, { paid: number; balance: number }>();
  for (const i of invoices) {
    const cur = i.currency ?? "—";
    const acc = byCurrency.get(cur) ?? { paid: 0, balance: 0 };
    acc.paid += i.paid;
    acc.balance += i.balance;
    byCurrency.set(cur, acc);
  }
  const overdue = invoices.filter((i) => i.payment_status === "سررسید گذشته");

  return (
    <Page
      active="/payments"
      title="پرداخت‌ها"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={<NewPaymentTrigger invoices={invoices} />}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="تعداد پرداخت‌ها" value={payments.total} />
        <Stat
          label="فاکتورهای سررسید گذشته"
          value={overdue.length}
          tone={overdue.length ? "warn" : "good"}
          hint={overdue.map((i) => i.invoice_no).slice(0, 3).join("، ") || undefined}
        />
        {[...byCurrency.entries()].slice(0, 2).map(([cur, v]) => (
          <Stat
            key={cur}
            label={`مانده بدهی (${cur})`}
            value={money(v.balance)}
            tone={v.balance > 0 ? "warn" : "good"}
            hint={`پرداخت‌شده: ${money(v.paid)}`}
          />
        ))}
      </div>

      <div className="mt-6">
        <PaymentsClient page={payments} invoices={invoices} />
      </div>
    </Page>
  );
}
