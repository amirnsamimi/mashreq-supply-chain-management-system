import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listShipments } from "@/lib/queries";
import { money, qty as fq, jalali } from "@/lib/format";
import { createShipment } from "@/lib/actions";
import { MODES } from "@/lib/lists";
import { Page, Card, Badge, Btn, Field, Empty } from "@/components/ui";
import { Collapse } from "@/components/Collapse";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  await requireAuth();
  const shipments = await listShipments();

  return (
    <Page
      active="/shipments"
      title="پارت‌های ارسال"
      action={
        <Collapse label="+ پارت جدید">
          <Card className="p-4">
            <form action={createShipment} className="grid gap-3 md:grid-cols-4">
              <Field label="شماره پارت *"><input name="shipment_no" required placeholder="SHP-001" /></Field>
              <Field label="نام کارگو"><input name="carrier" /></Field>
              <Field label="نوع حمل">
                <select name="mode">{MODES.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
              <Field label="شماره رهگیری"><input name="tracking_no" /></Field>
              <Field label="تحویل به کارگو"><input name="handover_date" type="date" /></Field>
              <Field label="تاریخ خروج"><input name="depart_date" type="date" /></Field>
              <Field label="تاریخ دریافت"><input name="receive_date" type="date" /></Field>
              <Field label="هزینه حمل پارت"><input name="freight_cost" inputMode="decimal" defaultValue="0" /></Field>
              <Field label="وزن (کیلو)"><input name="weight_kg" inputMode="decimal" /></Field>
              <Field label="حجم CBM"><input name="cbm" inputMode="decimal" /></Field>
              <Field label="توضیحات" className="md:col-span-2"><input name="notes" /></Field>
              <div className="md:col-span-4"><Btn>ثبت پارت</Btn></div>
            </form>
          </Card>
        </Collapse>
      }
    >
      <Card>
        {shipments.length === 0 ? (
          <Empty>هنوز پارتی ثبت نشده است</Empty>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={s.id}>
                    <td>
                      <Link href={`/shipments/${s.id}`} className="font-medium hover:underline">
                        {s.shipment_no}
                      </Link>
                    </td>
                    <td className="text-gray-500">{(s.invoice_nos as string) || "—"}</td>
                    <td>{(s.carrier as string) ?? "—"}</td>
                    <td>{(s.mode as string) ?? "—"}</td>
                    <td className="text-gray-500">{(s.tracking_no as string) ?? "—"}</td>
                    <td>{jalali(s.handover_date as string)}</td>
                    <td>{jalali(s.receive_date as string)}</td>
                    <td className="num">{s.transit_days ?? "—"}</td>
                    <td className="num">{fq(s.total_qty)}</td>
                    <td className="num">{fq(s.received_qty)}</td>
                    <td className="num">{money(s.freight_cost)}</td>
                    <td className="num">{money(s.freight_per_unit)}</td>
                    <td><Badge>{s.status}</Badge></td>
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
