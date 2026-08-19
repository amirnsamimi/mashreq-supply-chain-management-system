import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { invoiceByToken, invoiceMoney } from "@/lib/share";
import { money, qty as fq } from "@/lib/format";
import { DateText } from "@/components/DateText";
import { Badge, Card, Empty, Note } from "@/components/geist";
import { statusTone } from "@/lib/tones";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CalendarToggle } from "@/components/CalendarToggle";

export const dynamic = "force-dynamic";

// این صفحه نباید در موتورهای جست‌وجو ایندکس شود
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "وضعیت سفارش",
};

/** مبلغ پنهان — تا وقتی بیننده وارد سیستم نشده باشد */
function Masked() {
  return (
    <span
      title="برای دیدن مبالغ باید وارد سیستم شوید"
      className="select-none tracking-[0.2em] text-[var(--geist-tertiary)]"
    >
      ●●●
    </span>
  );
}

export default async function SharedInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await invoiceByToken(token);
  if (!inv) notFound();

  // مبالغ فقط وقتی از پایگاه داده خوانده می‌شوند که بیننده وارد سیستم باشد
  const viewer = await currentUser();
  const amounts = viewer ? await invoiceMoney(inv.invoice_id) : null;
  const M = ({ value }: { value: number | undefined }) =>
    amounts && value !== undefined ? <>{money(value)}</> : <Masked />;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--geist-border)] bg-[var(--geist-background)]">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">وضعیت سفارش</span>
          <div className="mr-auto flex items-center gap-2">
            <CalendarToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            فاکتور {inv.invoice_no}
          </h1>
          <Badge tone={statusTone(inv.payment_status)}>{inv.payment_status}</Badge>
          <Badge tone={statusTone(inv.invoice_status)}>{inv.invoice_status}</Badge>
        </div>

        {!viewer && (
          <div className="mb-4">
            <Note>
              این یک صفحه عمومی است و فقط وضعیت سفارش را نشان می‌دهد. مبالغ پنهان‌اند؛ اگر کاربر
              سیستم هستید،{" "}
              <Link href="/login" className="underline">
                وارد شوید
              </Link>{" "}
              تا اعداد را ببینید.
            </Note>
          </div>
        )}

        {/* خلاصه فاکتور */}
        <Card title="فاکتور">
          <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["تأمین‌کننده", inv.supplier ?? "—"],
              ["تاریخ فاکتور", <DateText key="d" value={inv.invoice_date} />],
              ["تاریخ سررسید", <DateText key="due" value={inv.due_date} />],
              ["ارز", inv.currency ?? "—"],
              ["مبلغ کل", <M key="t" value={amounts?.total_amount} />],
              ["مانده", <M key="b" value={amounts?.balance} />],
              ["تعداد پرداخت", fq(inv.payment_count)],
              [
                "آخرین پرداخت",
                inv.last_payment_date ? <DateText key="lp" value={inv.last_payment_date} /> : "—",
              ],
              ["جمع پرداختی", <M key="p" value={amounts?.paid} />],
            ].map(([label, value], i) => (
              <div key={i}>
                <dt className="text-xs text-[var(--geist-secondary)]">{label}</dt>
                <dd className="num mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* اقلام — تعداد عدد است نه مبلغ، پس عمومی است */}
        <div className="mt-4">
          <Card title={`اقلام سفارش (${inv.items.length})`}>
            {inv.items.length === 0 ? (
              <Empty title="قلمی ثبت نشده است" />
            ) : (
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>کالا</th>
                      <th>تعداد سفارش</th>
                      <th>ارسال‌شده</th>
                      <th>در مسیر</th>
                      <th>دریافت‌شده</th>
                      <th>باقی‌مانده</th>
                      {viewer && <th>قیمت واحد</th>}
                      {viewer && <th>مبلغ کل</th>}
                      <th>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it) => (
                      <tr key={it.id}>
                        <td className="font-medium">{it.sku ?? it.description ?? "—"}</td>
                        <td className="num">{fq(it.qty)}</td>
                        <td className="num">{fq(it.allocated)}</td>
                        <td className="num">{fq(it.in_transit)}</td>
                        <td className="num">{fq(it.received)}</td>
                        <td className="num">{fq(it.remaining)}</td>
                        {viewer && (
                          <td className="num">{money(amounts?.items[it.id]?.unit_price ?? 0)}</td>
                        )}
                        {viewer && (
                          <td className="num">{money(amounts?.items[it.id]?.line_total ?? 0)}</td>
                        )}
                        <td>
                          <Badge tone={statusTone(it.status)}>{it.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* پارت‌های ارسال */}
        <div className="mt-4">
          <Card title={`پارت‌های ارسال (${inv.shipments.length})`}>
            {inv.shipments.length === 0 ? (
              <Empty title="هنوز ارسالی انجام نشده است" />
            ) : (
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>پارت</th>
                      <th>کارگو</th>
                      <th>نوع حمل</th>
                      <th>رهگیری</th>
                      <th>تحویل به کارگو</th>
                      <th>خروج</th>
                      <th>دریافت</th>
                      <th>مدت (روز)</th>
                      <th>تعداد</th>
                      <th>دریافت‌شده</th>
                      {viewer && <th>هزینه حمل</th>}
                      <th>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.shipments.map((s) => (
                      <tr key={s.id}>
                        <td className="num font-medium">{s.shipment_no}</td>
                        <td>{s.carrier ?? "—"}</td>
                        <td>{s.mode ?? "—"}</td>
                        <td className="num">{s.tracking_no ?? "—"}</td>
                        <td>
                          <DateText value={s.handover_date} />
                        </td>
                        <td>
                          <DateText value={s.depart_date} />
                        </td>
                        <td>
                          <DateText value={s.receive_date} />
                        </td>
                        <td className="num">{s.transit_days ?? "—"}</td>
                        <td className="num">{fq(s.qty_shipped)}</td>
                        <td className="num">{fq(s.qty_received)}</td>
                        {viewer && <td className="num">{money(amounts?.freight[s.id] ?? 0)}</td>}
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

        <p className="mt-6 text-center text-xs text-[var(--geist-tertiary)]">
          این صفحه از طریق یک لینک اشتراک نمایش داده می‌شود و صاحب فاکتور می‌تواند هر زمان
          غیرفعالش کند.
        </p>
      </main>
    </div>
  );
}
