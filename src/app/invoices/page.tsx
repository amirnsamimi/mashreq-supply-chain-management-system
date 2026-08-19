import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { money, jalali } from "@/lib/format";
import { createInvoice } from "@/lib/actions";
import { CURRENCIES } from "@/lib/lists";
import { Page, Card, Badge, Field, Empty } from "@/components/ui";
import { Collapse } from "@/components/Collapse";
import { NumberInput } from "@/components/NumberInput";
import { TableSearch } from "@/components/TableSearch";
import { SubmitBtn } from "@/components/Confirm";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const me = await requireAuth();
  const invoices = await listInvoices();

  // جمع ستون‌ها فقط وقتی معنا دارد که همه فاکتورها هم‌ارز باشند
  const currencies = new Set(invoices.map((i) => i.currency ?? "—"));
  const single = currencies.size === 1 ? [...currencies][0] : null;
  const sum = (f: (i: (typeof invoices)[number]) => number) =>
    invoices.reduce((s, i) => s + f(i), 0);

  return (
    <Page
      active="/invoices"
      user={`${me.first_name} ${me.last_name}`}
      title="فاکتورها"
      action={
        <Collapse label="فاکتور جدید">
          <Card className="p-4">
            <form action={createInvoice} className="grid gap-3 md:grid-cols-4">
              <Field label="شماره فاکتور *">
                <input name="invoice_no" required placeholder="INV-001" dir="ltr" />
              </Field>
              <Field label="فروشنده">
                <input name="supplier" />
              </Field>
              <Field label="تاریخ فاکتور">
                <input name="invoice_date" type="date" dir="ltr" />
              </Field>
              <Field label="ارز">
                <select name="currency" defaultValue="RMB">
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="مبلغ کل فاکتور">
                <NumberInput name="total_amount" defaultValue={0} />
              </Field>
              <Field label="تاریخ سررسید">
                <input name="due_date" type="date" dir="ltr" />
              </Field>
              <Field label="توضیحات" className="md:col-span-2">
                <input name="notes" />
              </Field>
              <div className="md:col-span-4">
                <SubmitBtn>ثبت فاکتور</SubmitBtn>
              </div>
            </form>
          </Card>
        </Collapse>
      }
    >
      <Card>
        {invoices.length === 0 ? (
          <Empty>هنوز فاکتوری ثبت نشده است — با دکمه «فاکتور جدید» شروع کنید</Empty>
        ) : (
          <TableSearch placeholder="جست‌وجو در شماره فاکتور، فروشنده، وضعیت…">
            <div className="scroll-x">
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
                    <tr
                      key={i.id}
                      data-search={`${i.invoice_no} ${i.supplier ?? ""} ${i.currency ?? ""} ${i.payment_status} ${i.invoice_status}`.toLowerCase()}
                    >
                      <td>
                        <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                          {i.invoice_no}
                        </Link>
                      </td>
                      <td>{i.supplier ?? "—"}</td>
                      <td>{jalali(i.invoice_date)}</td>
                      <td className="text-[var(--geist-secondary)]">{i.currency ?? "—"}</td>
                      <td className="num">{money(i.total_amount)}</td>
                      <td className="num">{money(i.items_total)}</td>
                      <td
                        className={`num ${
                          Math.abs(i.diff) > 0.01
                            ? "font-medium text-[var(--geist-red-text)]"
                            : "text-[var(--geist-tertiary)]"
                        }`}
                      >
                        {money(i.diff)}
                      </td>
                      <td className="num text-[var(--geist-green-text)]">{money(i.paid)}</td>
                      <td className="num font-medium">{money(i.balance)}</td>
                      <td>{jalali(i.due_date)}</td>
                      <td>
                        <Badge>{i.payment_status}</Badge>
                      </td>
                      <td>
                        <Badge>{i.invoice_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>
                      جمع {invoices.length} فاکتور
                      {!single && (
                        <span className="mr-2 font-normal text-[var(--geist-tertiary)]">
                          (ارزهای مختلف — جمع فقط عددی است)
                        </span>
                      )}
                    </td>
                    <td className="num">{money(sum((i) => i.total_amount))}</td>
                    <td className="num">{money(sum((i) => i.items_total))}</td>
                    <td className="num">{money(sum((i) => i.diff))}</td>
                    <td className="num">{money(sum((i) => i.paid))}</td>
                    <td className="num">{money(sum((i) => i.balance))}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TableSearch>
        )}
      </Card>
    </Page>
  );
}
