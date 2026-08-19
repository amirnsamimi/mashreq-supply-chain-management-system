import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  getInvoice,
  listItems,
  listPayments,
  listAllocationsForItem,
} from "@/lib/queries";
import { money, qty as fq, jalali, isoDate } from "@/lib/format";
import {
  updateInvoice,
  deleteInvoice,
  createItem,
  updateItem,
  deleteItem,
  createPayment,
  deletePayment,
} from "@/lib/actions";
import { CURRENCIES, PAY_METHODS } from "@/lib/lists";
import { Page, Card, Badge, Field, Stat, Empty } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";
import { SubmitBtn } from "@/components/Confirm";

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
        <span className="flex items-center gap-3">
          فاکتور {inv.invoice_no}
          <Badge>{inv.payment_status}</Badge>
          <Badge>{inv.invoice_status}</Badge>
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
        <Stat label={`جمع مبلغ اقلام (${cur})`} value={money(inv.items_total)} hint={`${items.length} قلم`} />
        <Stat
          label={`اختلاف فاکتور و اقلام (${cur})`}
          value={money(inv.diff)}
          tone={Math.abs(inv.diff) > 0.01 ? "warn" : "good"}
        />
        <Stat label={`جمع پرداختی (${cur})`} value={money(inv.paid)} tone="good"
          hint={inv.last_payment_date ? `آخرین: ${jalali(inv.last_payment_date)}` : undefined} />
        <Stat label={`مانده (${cur})`} value={money(inv.balance)} tone={inv.balance > 0 ? "warn" : "good"} />
      </div>

      {/* اقلام */}
      <div className="mt-6">
        <Card title={`اقلام فاکتور (${items.length})`}>
          {items.length === 0 ? (
            <Empty>قلمی ثبت نشده است</Empty>
          ) : (
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>شرح کالا</th>
                    <th>تعداد</th>
                    <th>قیمت واحد</th>
                    <th>مبلغ کل</th>
                    <th>تخصیص‌یافته</th>
                    <th>باقی‌مانده</th>
                    <th>در مسیر</th>
                    <th>دریافت‌شده</th>
                    <th>حمل هر واحد</th>
                    <th>بهای تمام‌شده</th>
                    <th>وضعیت</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="font-medium">{it.sku ?? "—"}</td>
                      <td className="max-w-56 truncate">{it.description ?? "—"}</td>
                      <td className="num">{fq(it.qty)}</td>
                      <td className="num">{money(it.unit_price)}</td>
                      <td className="num">{money(it.line_total)}</td>
                      <td className="num">{fq(it.allocated)}</td>
                      <td className={`num ${it.remaining > 0 ? "text-[var(--geist-amber-text)]" : "text-[var(--geist-tertiary)]"}`}>
                        {fq(it.remaining)}
                      </td>
                      <td className="num">{fq(it.in_transit)}</td>
                      <td className="num">{fq(it.received)}</td>
                      <td className="num">{money(it.unit_freight)}</td>
                      <td className="num font-medium">{money(it.landed_unit_cost)}</td>
                      <td><Badge>{it.status}</Badge></td>
                      <td>
                        <details className="inline-block">
                          <summary className="cursor-pointer text-xs text-[var(--geist-tertiary)] hover:text-[var(--geist-foreground)]">
                            ویرایش
                          </summary>
                          <div className="absolute left-0 z-10 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-3 shadow-[var(--geist-shadow)]">
                            <form action={updateItem} className="grid gap-2">
                              <input type="hidden" name="id" value={it.id} />
                              <input type="hidden" name="invoice_id" value={id} />
                              <Field label="SKU"><input name="sku" defaultValue={it.sku ?? ""} /></Field>
                              <Field label="شرح"><input name="description" defaultValue={it.description ?? ""} /></Field>
                              <Field label="تعداد"><NumberInput name="qty" defaultValue={it.qty} /></Field>
                              <Field label="قیمت واحد"><NumberInput name="unit_price" defaultValue={it.unit_price} /></Field>
                              <SubmitBtn>ذخیره</SubmitBtn>
                            </form>
                            <form action={deleteItem} className="mt-2 border-t border-[var(--geist-border)] pt-2">
                              <input type="hidden" name="id" value={it.id} />
                              <input type="hidden" name="invoice_id" value={id} />
                              <SubmitBtn variant="danger" confirm="این قلم و تخصیص‌های آن به پارت‌ها حذف شود؟">حذف این قلم</SubmitBtn>
                            </form>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[var(--geist-border)] p-4">
            <form action={createItem} className="grid gap-3 md:grid-cols-6">
              <input type="hidden" name="invoice_id" value={id} />
              <Field label="کد کالا / SKU"><input name="sku" /></Field>
              <Field label="شرح کالا" className="md:col-span-2"><input name="description" /></Field>
              <Field label="تعداد"><NumberInput name="qty" defaultValue={0} /></Field>
              <Field label="قیمت واحد"><NumberInput name="unit_price" defaultValue={0} /></Field>
              <div className="flex items-end"><SubmitBtn>افزودن قلم</SubmitBtn></div>
            </form>
          </div>
        </Card>
      </div>

      {/* تخصیص هر قلم به پارت‌ها */}
      {items.some((it) => (allocsByItem[it.id] ?? []).length > 0) && (
        <div className="mt-6">
          <Card title="ارسال اقلام در پارت‌ها">
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>کالا</th>
                    <th>پارت</th>
                    <th>کارگو</th>
                    <th>ارسال‌شده</th>
                    <th>دریافت‌شده</th>
                    <th>مغایرت</th>
                    <th>تاریخ دریافت</th>
                  </tr>
                </thead>
                <tbody>
                  {items.flatMap((it) =>
                    (allocsByItem[it.id] ?? []).map((a) => (
                      <tr key={a.id}>
                        <td>{(it.sku as string) ?? it.description ?? "—"}</td>
                        <td>
                          <Link href={`/shipments/${a.shipment_id}`} className="font-medium hover:underline">
                            {a.shipment_no as string}
                          </Link>
                        </td>
                        <td>{a.carrier ?? "—"}</td>
                        <td className="num">{fq(a.qty_shipped)}</td>
                        <td className="num">{fq(a.qty_received)}</td>
                        <td className={`num ${a.qty_shipped - a.qty_received > 0 ? "text-[var(--geist-amber-text)]" : "text-[var(--geist-tertiary)]"}`}>
                          {fq(a.qty_shipped - a.qty_received)}
                        </td>
                        <td>{jalali(a.receive_date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* پرداخت‌ها */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title={`پرداخت‌ها (${payments.length})`} className="lg:col-span-2">
          {payments.length === 0 ? (
            <Empty>پرداختی ثبت نشده است</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>مبلغ</th>
                  <th>روش</th>
                  <th>مرجع/رسید</th>
                  <th>توضیحات</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{jalali(p.payment_date)}</td>
                    <td className="num font-medium">{money(p.amount)}</td>
                    <td>{p.method ?? "—"}</td>
                    <td>{p.reference ?? "—"}</td>
                    <td className="text-[var(--geist-secondary)]">{p.notes ?? "—"}</td>
                    <td>
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="invoice_id" value={id} />
                        <SubmitBtn variant="danger" confirm="این پرداخت حذف شود؟">حذف</SubmitBtn>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-[var(--geist-border)] p-4">
            <form action={createPayment} className="grid gap-3 md:grid-cols-5">
              <input type="hidden" name="invoice_id" value={id} />
              <Field label="تاریخ پرداخت"><input name="payment_date" type="date" /></Field>
              <Field label="مبلغ"><NumberInput name="amount" defaultValue={0} /></Field>
              <Field label="روش">
                <select name="method">
                  {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="مرجع/رسید"><input name="reference" /></Field>
              <div className="flex items-end"><SubmitBtn>ثبت پرداخت</SubmitBtn></div>
            </form>
          </div>
        </Card>

        <Card title="ویرایش فاکتور">
          <form action={updateInvoice} className="grid gap-3 p-4">
            <input type="hidden" name="id" value={id} />
            <Field label="شماره فاکتور"><input name="invoice_no" defaultValue={inv.invoice_no} required /></Field>
            <Field label="فروشنده"><input name="supplier" defaultValue={inv.supplier ?? ""} /></Field>
            <Field label="تاریخ فاکتور"><input name="invoice_date" type="date" defaultValue={isoDate(inv.invoice_date)} /></Field>
            <Field label="ارز">
              <select name="currency" defaultValue={cur}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="مبلغ کل فاکتور"><NumberInput name="total_amount" defaultValue={inv.total_amount} /></Field>
            <Field label="تاریخ سررسید"><input name="due_date" type="date" defaultValue={isoDate(inv.due_date)} /></Field>
            <Field label="توضیحات"><textarea name="notes" rows={2} defaultValue={inv.notes ?? ""} /></Field>
            <SubmitBtn>ذخیره تغییرات</SubmitBtn>
          </form>
          <form action={deleteInvoice} className="border-t border-[var(--geist-border)] p-4">
            <input type="hidden" name="id" value={id} />
            <SubmitBtn variant="danger" confirm="کل فاکتور با همه اقلام، تخصیص‌ها و پرداخت‌هایش حذف شود؟ این کار برگشت‌پذیر نیست.">حذف فاکتور و همه اقلام و پرداخت‌های آن</SubmitBtn>
          </form>
        </Card>
      </div>
    </Page>
  );
}
