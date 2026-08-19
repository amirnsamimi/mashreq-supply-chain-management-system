import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listInvoices, listShipments } from "@/lib/queries";
import { listNotifications } from "@/lib/notifications";
import { money } from "@/lib/format";
import { Page } from "@/components/Nav";
import { DateText } from "@/components/DateText";
import { Badge, Button, Card, Empty, Stat } from "@/components/geist";
import { statusTone } from "@/lib/tones";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireAuth();
  const invoices = await listInvoices();
  const shipments = await listShipments();
  const notifications = await listNotifications();

  /* داشبورد = کارهایی که امروز باید انجام شوند، نه آمار کلی */
  const overdue = invoices.filter((i) => i.payment_status === "سررسید گذشته");
  const dueSoon = invoices.filter((i) => {
    if (i.balance <= 0.005 || !i.due_date) return false;
    const days = Math.round(
      (new Date(i.due_date).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) /
        86_400_000
    );
    return days >= 0 && days <= 7;
  });
  const mismatched = invoices.filter((i) => Math.abs(i.diff) > 0.01);
  const inTransit = shipments.filter((s) => s.status === "در مسیر");
  const atCarrier = shipments.filter((s) => s.status === "تحویل به کارگو");
  const shortReceipt = shipments.filter(
    (s) => s.receive_date && s.received_qty < s.total_qty - 0.0005
  );
  const unread = notifications.filter((n) => !n.read_at);

  const attention = [
    ...overdue.map((i) => ({ i, why: "سررسید گذشته" as const })),
    ...dueSoon.map((i) => ({ i, why: "سررسید نزدیک" as const })),
    ...mismatched
      .filter((i) => !overdue.includes(i) && !dueSoon.includes(i))
      .map((i) => ({ i, why: "اختلاف مبلغ" as const })),
  ].slice(0, 10);

  return (
    <Page
      active="/"
      title="داشبورد"
      user={`${me.first_name} ${me.last_name}`}
      action={
        <Link href="/reports">
          <Button>گزارش‌ها و نمودارها</Button>
        </Link>
      }
    >
      {/* شمارنده‌های اقدام‌محور */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="سررسید گذشته"
          value={overdue.length}
          tone={overdue.length ? "warn" : "good"}
          hint={overdue.length ? "همین امروز پیگیری کنید" : "چیزی معوق نیست"}
        />
        <Stat label="سررسید تا ۷ روز آینده" value={dueSoon.length} />
        <Stat
          label="اختلاف مبلغ فاکتور و اقلام"
          value={mismatched.length}
          tone={mismatched.length ? "warn" : "good"}
        />
        <Stat label="پارت در مسیر" value={inTransit.length} hint={`${atCarrier.length} نزد کارگو`} />
        <Stat
          label="مغایرت در تحویل"
          value={shortReceipt.length}
          tone={shortReceipt.length ? "warn" : "good"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* نیازمند اقدام */}
        <Card
          title={`نیازمند پیگیری (${attention.length})`}
          action={
            <Link href="/invoices" className="text-xs text-[var(--geist-secondary)] hover:underline">
              همه فاکتورها
            </Link>
          }
        >
          {attention.length === 0 ? (
            <Empty title="همه‌چیز مرتب است">فاکتور معوق یا مغایرتی وجود ندارد</Empty>
          ) : (
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>فاکتور</th>
                    <th>تأمین‌کننده</th>
                    <th>مانده</th>
                    <th>سررسید</th>
                    <th>دلیل</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map(({ i, why }) => (
                    <tr key={`${i.id}-${why}`}>
                      <td>
                        <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                          {i.invoice_no}
                        </Link>
                      </td>
                      <td className="max-w-40 truncate">{i.supplier ?? "—"}</td>
                      <td className="num">
                        {money(i.balance)}{" "}
                        <span className="text-[var(--geist-tertiary)]">{i.currency}</span>
                      </td>
                      <td>
                        <DateText value={i.due_date} />
                      </td>
                      <td>
                        <Badge tone={why === "سررسید گذشته" ? "red" : why === "سررسید نزدیک" ? "amber" : "blue"}>
                          {why}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* پارت‌های در جریان */}
        <Card
          title={`پارت‌های در جریان (${inTransit.length + atCarrier.length})`}
          action={
            <Link href="/shipments" className="text-xs text-[var(--geist-secondary)] hover:underline">
              همه پارت‌ها
            </Link>
          }
        >
          {inTransit.length + atCarrier.length === 0 ? (
            <Empty title="پارتی در راه نیست" />
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
                  {[...inTransit, ...atCarrier].slice(0, 10).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/shipments/${s.id}`} className="font-medium hover:underline">
                          {s.shipment_no}
                        </Link>
                      </td>
                      <td className="max-w-32 truncate text-[var(--geist-secondary)]">
                        {s.invoice_nos || "—"}
                      </td>
                      <td>{s.carrier ?? "—"}</td>
                      <td>
                        <DateText value={s.handover_date} />
                      </td>
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

      {/* آخرین اعلان‌ها */}
      <div className="mt-4">
        <Card
          title={`اعلان‌های خوانده‌نشده (${unread.length})`}
          action={
            <Link href="/notifications" className="text-xs text-[var(--geist-secondary)] hover:underline">
              همه اعلان‌ها
            </Link>
          }
        >
          {unread.length === 0 ? (
            <Empty title="اعلان خوانده‌نشده‌ای ندارید">
              با ساخت قالب در «اعلان‌ها» می‌توانید یادآوری‌های خودکار بسازید
            </Empty>
          ) : (
            <ul className="divide-y divide-[var(--geist-border)]">
              {unread.slice(0, 6).map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge tone={n.severity === "critical" ? "red" : n.severity === "warning" ? "amber" : "blue"} dot>
                    {n.severity === "critical" ? "بحرانی" : n.severity === "warning" ? "هشدار" : "اطلاع"}
                  </Badge>
                  {n.target_id ? (
                    <Link
                      href={n.target === "invoice" ? `/invoices/${n.target_id}` : `/shipments/${n.target_id}`}
                      className="hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <span>{n.title}</span>
                  )}
                  <span className="mr-auto text-xs text-[var(--geist-tertiary)]">
                    <DateText value={n.created_at} withTime />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
