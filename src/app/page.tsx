import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { dashboard, listInvoices, listShipments } from "@/lib/queries";
import { money, jalali } from "@/lib/format";
import { Page } from "@/components/Nav";
import { Badge, Card, Empty, Stat } from "@/components/geist";
import { statusTone } from "@/lib/tones";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireAuth();
  const d = await dashboard();
  const invoices = await listInvoices();
  const shipments = await listShipments();

  const attention = invoices
    .filter((i) => i.payment_status === "سررسید گذشته" || Math.abs(i.diff) > 0.01)
    .slice(0, 8);
  const activeShipments = shipments.filter((s) => s.status !== "تحویل‌شده").slice(0, 8);

  return (
    <Page active="/"
      user={`${me.first_name} ${me.last_name}`} title="داشبورد">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="فاکتورها" value={d.invoices} hint={`${d.openInvoices} باز`} />
        <Stat label="اقلام کالا" value={d.items} />
        <Stat label="پارت‌های ارسال" value={d.shipments} />
        <Stat label="تحویل به کارگو" value={d.atCarrier} />
        <Stat label="در مسیر" value={d.inTransit} />
        <Stat label="تحویل‌شده" value={d.delivered} tone="good" />
      </div>

      {/* مبالغ به تفکیک ارز */}
      <div className="mt-4">
        <Card title="مبالغ به تفکیک ارز">
          {d.currencies.length === 0 ? (
            <Empty title="هنوز فاکتوری ثبت نشده است" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ارز</th>
                  <th>مبلغ کل فاکتورها</th>
                  <th>جمع پرداختی</th>
                  <th>مانده بدهی</th>
                </tr>
              </thead>
              <tbody>
                {d.currencies.map((c) => (
                  <tr key={c.currency}>
                    <td className="font-medium">{c.currency}</td>
                    <td className="num">{money(c.total)}</td>
                    <td className="num text-[var(--geist-green-text)]">{money(c.paid)}</td>
                    <td
                      className={`num font-medium ${
                        c.balance > 0 ? "text-[var(--geist-red-text)]" : ""
                      }`}
                    >
                      {money(c.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-[var(--geist-border)] px-4 py-2.5 text-xs text-[var(--geist-tertiary)]">
            جمع هزینه حمل همه پارت‌ها: <span className="num">{money(d.freight)}</span>
            {d.overdue > 0 && ` — ${d.overdue} فاکتور سررسید گذشته`}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="نیازمند بررسی">
          {attention.length === 0 ? (
            <Empty title="موردی نیست" />
          ) : (
            <div className="scroll-x">
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
                      <td className="num">
                        {money(i.balance)} <span className="text-[var(--geist-tertiary)]">{i.currency}</span>
                      </td>
                      <td
                        className={`num ${
                          Math.abs(i.diff) > 0.01
                            ? "text-[var(--geist-red-text)] font-medium"
                            : "text-[var(--geist-tertiary)]"
                        }`}
                      >
                        {money(i.diff)}
                      </td>
                      <td>
                        <Badge tone={statusTone(i.payment_status)}>{i.payment_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="پارت‌های در جریان">
          {activeShipments.length === 0 ? (
            <Empty title="موردی نیست" />
          ) : (
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>پارت</th>
                    <th>فاکتور</th>
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
                      <td className="text-[var(--geist-secondary)]">{s.invoice_nos || "—"}</td>
                      <td>{s.carrier ?? "—"}</td>
                      <td>{jalali(s.handover_date)}</td>
                      <td>
                        <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
