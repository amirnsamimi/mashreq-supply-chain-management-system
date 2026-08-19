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
import { Page, Card, Badge, Btn, Field, Stat, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const id = Number((await params).id);
  const sh = await getShipment(id);
  if (!sh) notFound();

  const allocs = await listAllocationsForShipment(id);
  const openItems = await listOpenItems();

  return (
    <Page
      active="/shipments"
      title={
        <span className="flex items-center gap-3">
          پارت {sh.shipment_no}
          <Badge>{sh.status}</Badge>
        </span>
      }
      action={
        <Link href="/shipments" className="text-sm text-gray-500 hover:underline">
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
            <div className="overflow-x-auto">
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
                        <td>{(a.sku as string) ?? "—"}</td>
                        <td className="max-w-56 truncate">{(a.description as string) ?? "—"}</td>
                        <td className="num text-gray-500">{fq(a.item_qty)}</td>
                        <td>
                          <form action={updateAllocation} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="shipment_id" value={id} />
                            <input name="qty_shipped" defaultValue={a.qty_shipped} title="تعداد ارسال‌شده" placeholder="ارسال" className="!w-24 !py-1" inputMode="decimal" />
                            <input name="qty_received" defaultValue={a.qty_received} title="تعداد دریافت‌شده" placeholder="دریافت" className="!w-24 !py-1" inputMode="decimal" />
                            <Btn variant="ghost" className="!py-1">ذخیره</Btn>
                          </form>
                        </td>
                        <td className={`num ${a.variance > 0 ? "text-amber-600" : "text-gray-400"}`}>
                          {fq(a.variance)}
                        </td>
                        <td className="num">{money(share)}</td>
                        <td>
                          <form action={deleteAllocation}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="shipment_id" value={id} />
                            <Btn variant="danger">حذف</Btn>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-200 p-4">
            <form action={createAllocation} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="shipment_id" value={id} />
              <Field label="کالا (از فاکتورها)" className="md:col-span-2">
                <select name="item_id" required defaultValue="">
                  <option value="" disabled>انتخاب کنید…</option>
                  {openItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.invoice_no} — {it.sku ?? it.description ?? `قلم ${it.id}`} (باقی‌مانده: {it.remaining})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="تعداد ارسال در این پارت"><input name="qty_shipped" inputMode="decimal" defaultValue="0" /></Field>
              <div className="flex items-end"><Btn>+ افزودن کالا به پارت</Btn></div>
            </form>
            <p className="mt-2 text-xs text-gray-400">
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
            <Field label="نام کارگو"><input name="carrier" defaultValue={(sh.carrier as string) ?? ""} /></Field>
            <Field label="نوع حمل">
              <select name="mode" defaultValue={(sh.mode as string) ?? ""}>
                <option value="">—</option>
                {MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="شماره رهگیری"><input name="tracking_no" defaultValue={(sh.tracking_no as string) ?? ""} /></Field>
            <Field label="تحویل به کارگو"><input name="handover_date" type="date" defaultValue={isoDate(sh.handover_date as string)} /></Field>
            <Field label="تاریخ خروج"><input name="depart_date" type="date" defaultValue={isoDate(sh.depart_date as string)} /></Field>
            <Field label="تاریخ دریافت"><input name="receive_date" type="date" defaultValue={isoDate(sh.receive_date as string)} /></Field>
            <Field label="هزینه حمل پارت"><input name="freight_cost" defaultValue={sh.freight_cost} inputMode="decimal" /></Field>
            <Field label="وزن (کیلو)"><input name="weight_kg" defaultValue={(sh.weight_kg as string) ?? ""} inputMode="decimal" /></Field>
            <Field label="حجم CBM"><input name="cbm" defaultValue={(sh.cbm as string) ?? ""} inputMode="decimal" /></Field>
            <Field label="توضیحات" className="md:col-span-2"><input name="notes" defaultValue={(sh.notes as string) ?? ""} /></Field>
            <div className="md:col-span-4"><Btn>ذخیره تغییرات</Btn></div>
          </form>
          <form action={deleteShipment} className="border-t border-gray-200 p-4">
            <input type="hidden" name="id" value={id} />
            <Btn variant="danger">حذف این پارت</Btn>
          </form>
        </Card>
      </div>
    </Page>
  );
}
