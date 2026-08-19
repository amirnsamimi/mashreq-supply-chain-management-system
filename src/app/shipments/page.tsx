import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listShipments } from "@/lib/queries";
import { money, qty as fq, jalali } from "@/lib/format";
import { createShipment } from "@/lib/actions";
import { MODES } from "@/lib/lists";
import { Page, Card, Badge, Field, Empty } from "@/components/ui";
import { Collapse } from "@/components/Collapse";
import { NumberInput } from "@/components/NumberInput";
import { TableSearch } from "@/components/TableSearch";
import { SubmitBtn } from "@/components/Confirm";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const me = await requireAuth();
  const shipments = await listShipments();
  const sum = (f: (s: (typeof shipments)[number]) => number) =>
    shipments.reduce((a, s) => a + f(s), 0);

  return (
    <Page
      active="/shipments"
      user={`${me.first_name} ${me.last_name}`}
      title="پارت‌های ارسال"
      action={
        <Collapse label="پارت جدید">
          <Card className="p-4">
            <form action={createShipment} className="grid gap-3 md:grid-cols-4">
              <Field label="شماره پارت *">
                <input name="shipment_no" required placeholder="SHP-001" dir="ltr" />
              </Field>
              <Field label="نام کارگو"><input name="carrier" /></Field>
              <Field label="نوع حمل">
                <select name="mode">{MODES.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
              <Field label="شماره رهگیری"><input name="tracking_no" dir="ltr" /></Field>
              <Field label="تحویل به کارگو"><input name="handover_date" type="date" dir="ltr" /></Field>
              <Field label="تاریخ خروج"><input name="depart_date" type="date" dir="ltr" /></Field>
              <Field label="تاریخ دریافت"><input name="receive_date" type="date" dir="ltr" /></Field>
              <Field label="هزینه حمل پارت"><NumberInput name="freight_cost" defaultValue={0} /></Field>
              <Field label="وزن (کیلو)"><NumberInput name="weight_kg" /></Field>
              <Field label="حجم CBM"><NumberInput name="cbm" /></Field>
              <Field label="توضیحات" className="md:col-span-2"><input name="notes" /></Field>
              <div className="md:col-span-4"><SubmitBtn>ثبت پارت</SubmitBtn></div>
            </form>
          </Card>
        </Collapse>
      }
    >
      <Card>
        {shipments.length === 0 ? (
          <Empty>هنوز پارتی ثبت نشده است — با دکمه «پارت جدید» شروع کنید</Empty>
        ) : (
          <TableSearch placeholder="جست‌وجو در شماره پارت، فاکتور، کارگو، رهگیری، وضعیت…">
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>شماره پارت</th>
                    <th>فاکتورها</th>
                    <th>کارگو</th>
                    <th>نوع حمل</th>
                    <th>رهگیری</th>
                    <th>تحویل به کارگو</th>
                    <th>دریافت</th>
                    <th>مدت (روز)</th>
                    <th>تعداد کالا</th>
                    <th>دریافت‌شده</th>
                    <th>هزینه حمل</th>
                    <th>حمل هر واحد</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr
                      key={s.id}
                      data-search={`${s.shipment_no} ${s.invoice_nos} ${s.carrier ?? ""} ${s.mode ?? ""} ${s.tracking_no ?? ""} ${s.status}`.toLowerCase()}
                    >
                      <td>
                        <Link href={`/shipments/${s.id}`} className="font-medium hover:underline">
                          {s.shipment_no}
                        </Link>
                      </td>
                      <td className="text-[var(--geist-secondary)]">{s.invoice_nos || "—"}</td>
                      <td>{s.carrier ?? "—"}</td>
                      <td>{s.mode ?? "—"}</td>
                      <td className="num text-[var(--geist-secondary)]">{s.tracking_no ?? "—"}</td>
                      <td>{jalali(s.handover_date)}</td>
                      <td>{jalali(s.receive_date)}</td>
                      <td className="num">{s.transit_days ?? "—"}</td>
                      <td className="num">{fq(s.total_qty)}</td>
                      <td className="num">{fq(s.received_qty)}</td>
                      <td className="num">{money(s.freight_cost)}</td>
                      <td className="num">{money(s.freight_per_unit)}</td>
                      <td><Badge>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8}>جمع {shipments.length} پارت</td>
                    <td className="num">{fq(sum((s) => s.total_qty))}</td>
                    <td className="num">{fq(sum((s) => s.received_qty))}</td>
                    <td className="num">{money(sum((s) => s.freight_cost))}</td>
                    <td colSpan={2}></td>
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
