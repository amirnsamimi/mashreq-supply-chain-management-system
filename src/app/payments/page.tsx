import { requireAuth } from "@/lib/auth";
import { listAllPayments, listInvoices } from "@/lib/queries";
import { money } from "@/lib/format";
import { Page } from "@/components/Nav";
import { Stat } from "@/components/geist";
import { NewPaymentTrigger, PaymentsClient } from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const me = await requireAuth();
  const payments = await listAllPayments();
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
      action={<NewPaymentTrigger invoices={invoices} />}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="تعداد پرداخت‌ها" value={payments.length} />
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
        <PaymentsClient payments={payments} invoices={invoices} />
      </div>
    </Page>
  );
}
