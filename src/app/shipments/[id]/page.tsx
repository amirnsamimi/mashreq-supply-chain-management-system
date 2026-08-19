import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getShipment, listAllocationsForShipment, listOpenItems } from "@/lib/queries";
import { money, qty as fq, isoDate } from "@/lib/format";
import {
  updateShipment,
  deleteShipment,
  createAllocation,
  updateAllocation,
  deleteAllocation,
} from "@/lib/actions";
import { MODES } from "@/lib/lists";
import { Page, Card, Badge, Field, Stat, Empty } from "@/components/ui";
import { NumberInput } from "@/components/NumberInput";
import { AllocationPicker } from "@/components/AllocationPicker";
import { SubmitBtn } from "@/components/Confirm";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAuth();
  const id = Number((await params).id);
  const sh = await getShipment(id);
  if (!sh) notFound();

  const allocs = await listAllocationsForShipment(id);
  const openItems = await listOpenItems();

  return (
    <Page
      active="/shipments"
      user={`${me.first_name} ${me.last_name}`}
      title={
        <span className="flex items-center gap-3">
          پارت {sh.shipment_no}
          <Badge>{sh.status}</Badge>
        </span>
      }
      action={
        <Link href="/shipments" className="text-sm text-[var(--geist-secondary)] hover:underline">
          ← بازگشت به فهرست
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="هزینه حمل پارت" value={money(sh.freight_cost)} />
        <Stat label="تعداد کل کالا" value={fq(sh.total_qty)} hint={`${allocs.length} قلم`} />
        <Stat label="دریافت‌شده" value={fq(sh.received_qty)} tone="good" />
        <Stat label="هزینه حمل هر واحد" value={money(sh.freight_per_unit)} />
        <Stat label="مدت حمل (روز)" value={sh.transit_days ?? "—"} />
      </div>

      <div className="mt-6">
        <Card title={`اقلام این پارت (${allocs.length})`}>
          {allocs.length === 0 ? (
            <Empty>هنوز کالایی به این پارت تخصیص نیافته است</Empty>
          ) : (
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>فاکتور</th>
                    <th>SKU</th>
                    <th>شرح</th>
                    <th>تعداد کل قلم</th>
                    <th>ارسال‌شده / دریافت‌شده در این پارت</th>
                    <th>مغایرت</th>
                    <th>سهم از هزینه حمل</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a) => {
                    const share =
                      sh.total_qty > 0 ? (a.qty_shipped / sh.total_qty) * sh.freight_cost : 0;
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link href={`/invoices/${a.invoice_id}`} className="font-medium hover:underline">
                            {a.invoice_no as string}
                          </Link>
                        </td>
                        <td>{a.sku ?? "—"}</td>
                        <td className="max-w-56 truncate">{a.description ?? "—"}</td>
                        <td className="num text-[var(--geist-secondary)]">{fq(a.item_qty)}</td>
                        <td>
                          <form action={updateAllocation} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="shipment_id" value={id} />
                            <NumberInput name="qty_shipped" defaultValue={a.qty_shipped} title="تعداد ارسال‌شده" placeholder="ارسال" className="!w-24 !py-1" />
                            <NumberInput name="qty_received" defaultValue={a.qty_received} title="تعداد دریافت‌شده" placeholder="دریافت" className="!w-24 !py-1" />
                            <SubmitBtn variant="ghost" className="!py-1 !px-2 !text-xs">ذخیره</SubmitBtn>
                          </form>
                        </td>
                        <td className={`num ${a.variance > 0 ? "text-[var(--geist-amber-text)]" : "text-[var(--geist-tertiary)]"}`}>
                          {fq(a.variance)}
                        </td>
                        <td className="num">{money(share)}</td>
                        <td>
                          <form action={deleteAllocation}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="shipment_id" value={id} />
                            <SubmitBtn variant="danger" confirm="این تخصیص از پارت حذف شود؟">حذف</SubmitBtn>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[var(--geist-border)] p-4">
            <form action={createAllocation}>
              <input type="hidden" name="shipment_id" value={id} />
              <AllocationPicker items={openItems} />
            </form>
            <p className="mt-3 text-xs text-[var(--geist-tertiary)]">
              هزینه حمل این پارت به نسبت تعداد، بین اقلام سرشکن می‌شود و در بهای تمام‌شده هر واحد در صفحه فاکتور دیده می‌شود.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="ویرایش پارت">
          <form action={updateShipment} className="grid gap-3 p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={id} />
            <Field label="شماره پارت"><input name="shipment_no" defaultValue={sh.shipment_no} required /></Field>
            <Field label="نام کارگو"><input name="carrier" defaultValue={sh.carrier ?? ""} /></Field>
            <Field label="نوع حمل">
              <select name="mode" defaultValue={sh.mode ?? ""}>
                <option value="">—</option>
                {MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="شماره رهگیری"><input name="tracking_no" defaultValue={sh.tracking_no ?? ""} /></Field>
            <Field label="تحویل به کارگو"><input name="handover_date" dir="ltr" type="date" defaultValue={isoDate(sh.handover_date)} /></Field>
            <Field label="تاریخ خروج"><input name="depart_date" dir="ltr" type="date" defaultValue={isoDate(sh.depart_date)} /></Field>
            <Field label="تاریخ دریافت"><input name="receive_date" dir="ltr" type="date" defaultValue={isoDate(sh.receive_date)} /></Field>
            <Field label="هزینه حمل پارت"><NumberInput name="freight_cost" defaultValue={sh.freight_cost} /></Field>
            <Field label="وزن (کیلو)"><NumberInput name="weight_kg" defaultValue={sh.weight_kg} /></Field>
            <Field label="حجم CBM"><NumberInput name="cbm" defaultValue={sh.cbm} /></Field>
            <Field label="توضیحات" className="md:col-span-2"><input name="notes" defaultValue={sh.notes ?? ""} /></Field>
            <div className="md:col-span-4"><SubmitBtn>ذخیره تغییرات</SubmitBtn></div>
          </form>
          <form action={deleteShipment} className="border-t border-[var(--geist-border)] p-4">
            <input type="hidden" name="id" value={id} />
            <SubmitBtn variant="danger" confirm="این پارت و همه تخصیص‌های آن حذف شود؟">حذف این پارت</SubmitBtn>
          </form>
        </Card>
      </div>
    </Page>
  );
}
