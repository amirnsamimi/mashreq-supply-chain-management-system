import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { money, jalali } from "@/lib/format";
import { createInvoice } from "@/lib/actions";
import { CURRENCIES } from "@/lib/lists";
import { Page, Card, Badge, Btn, Field, Empty } from "@/components/ui";
import { Collapse } from "@/components/Collapse";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireAuth();
  const invoices = await listInvoices();

  return (
    <Page
      active="/invoices"
      title="فاکتورها"
      action={
        <Collapse label="+ فاکتور جدید">
          <Card className="p-4">
            <form action={createInvoice} className="grid gap-3 md:grid-cols-4">
              <Field label="شماره فاکتور *">
                <input name="invoice_no" required placeholder="INV-001" />
              </Field>
              <Field label="فروشنده">
                <input name="supplier" />
              </Field>
              <Field label="تاریخ فاکتور">
                <input name="invoice_date" type="date" />
              </Field>
              <Field label="ارز">
                <select name="currency" defaultValue="RMB">
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="مبلغ کل فاکتور">
                <input name="total_amount" inputMode="decimal" />
              </Field>
              <Field label="تاریخ سررسید">
                <input name="due_date" type="date" />
              </Field>
              <Field label="توضیحات" className="md:col-span-2">
                <input name="notes" />
              </Field>
              <div className="md:col-span-4">
                <Btn>ثبت فاکتور</Btn>
              </div>
            </form>
          </Card>
        </Collapse>
      }
    >
      <Card>
        {invoices.length === 0 ? (
          <Empty>هنوز فاکتوری ثبت نشده است</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>شماره فاکتور</th>
                  <th>فروشنده</th>
                  <th>تاریخ</th>
                  <th>ارز</th>
                  <th>مبلغ کل</th>
                  <th>جمع اقلام</th>
                  <th>اختلاف</th>
                  <th>پرداختی</th>
                  <th>مانده</th>
                  <th>سررسید</th>
                  <th>وضعیت پرداخت</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                        {i.invoice_no}
                      </Link>
                    </td>
                    <td>{(i.supplier as string) ?? "—"}</td>
                    <td>{jalali(i.invoice_date as string)}</td>
                    <td>{(i.currency as string) ?? "—"}</td>
                    <td className="num">{money(i.total_amount)}</td>
                    <td className="num">{money(i.items_total)}</td>
                    <td className={`num ${Math.abs(i.diff) > 0.01 ? "text-red-600 font-medium" : "text-gray-400"}`}>
                      {money(i.diff)}
                    </td>
                    <td className="num">{money(i.paid)}</td>
                    <td className="num font-medium">{money(i.balance)}</td>
                    <td>{jalali(i.due_date as string)}</td>
                    <td><Badge>{i.payment_status}</Badge></td>
                    <td><Badge>{i.invoice_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
