import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { dashboard, listInvoices, listShipments } from "@/lib/queries";
import { money, jalali } from "@/lib/format";
import { Page, Stat, Card, Badge, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAuth();
  const d = await dashboard();
  const invoices = await listInvoices();
  const shipments = await listShipments();

  const attention = invoices
    .filter((i) => i.payment_status === "سررسید گذشته" || Math.abs(i.diff) > 0.01)
    .slice(0, 8);
  const activeShipments = shipments
    .filter((s) => s.status !== "تحویل‌شده")
    .slice(0, 8);

  return (
    <Page active="/" title="داشبورد">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="فاکتورها" value={d.invoices} hint={`${d.openInvoices} فاکتور باز`} />
        <Stat label="مبلغ کل فاکتورها" value={money(d.totalAmount)} hint={`${d.items} قلم کالا`} />
        <Stat label="جمع پرداختی" value={money(d.paid)} tone="good" />
        <Stat
          label="مانده بدهی"
          value={money(d.balance)}
          tone={d.balance > 0 ? "warn" : "good"}
          hint={d.overdue ? `${d.overdue} فاکتور سررسید گذشته` : "بدون سررسید گذشته"}
        />
        <Stat label="پارت‌های ارسال" value={d.shipments} />
        <Stat label="در مسیر" value={d.inTransit} />
        <Stat label="تحویل‌شده" value={d.delivered} tone="good" />
        <Stat label="هزینه حمل" value={money(d.freight)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="نیازمند بررسی">
          {attention.length === 0 ? (
            <Empty>موردی نیست</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>فاکتور</th>
                  <th>مانده</th>
                  <th>اختلاف با اقلام</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                        {i.invoice_no}
                      </Link>
                    </td>
                    <td className="num">{money(i.balance)}</td>
                    <td className={`num ${Math.abs(i.diff) > 0.01 ? "text-red-600" : ""}`}>
                      {money(i.diff)}
                    </td>
                    <td>
                      <Badge>{i.payment_status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="پارت‌های در جریان">
          {activeShipments.length === 0 ? (
            <Empty>موردی نیست</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>پارت</th>
                  <th>کارگو</th>
                  <th>تحویل به کارگو</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {activeShipments.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/shipments/${s.id}`} className="font-medium hover:underline">
                        {s.shipment_no}
                      </Link>
                    </td>
                    <td>{(s.carrier as string) ?? "—"}</td>
                    <td>{jalali(s.handover_date as string)}</td>
                    <td>
                      <Badge>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Page>
  );
}
