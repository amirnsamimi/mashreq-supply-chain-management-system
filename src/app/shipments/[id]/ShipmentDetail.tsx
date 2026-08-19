"use client";

import Link from "next/link";
import type { Shipment } from "@/lib/queries";
import { money, qty as fq } from "@/lib/format";
import {
  createAllocation,
  deleteAllocation,
  deleteShipment,
  updateAllocation,
  updateShipment,
} from "@/lib/actions";
import { MODES } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Button, Card, DateInput, Empty, Input, NumberInput, SelectField } from "@/components/geist";
import { AllocationPicker, type PickerItem } from "@/components/AllocationPicker";

type Alloc = {
  id: number;
  invoice_id: number;
  invoice_no: string;
  sku: string | null;
  description: string | null;
  item_qty: number;
  qty_shipped: number;
  qty_received: number;
  variance: number;
};

export function AllocationsCard({
  shipment,
  allocs,
  openItems,
}: {
  shipment: Shipment;
  allocs: Alloc[];
  openItems: PickerItem[];
}) {
  return (
    <Card
      title={`اقلام این پارت (${allocs.length})`}
      footer="هزینه حمل این پارت به نسبت تعداد بین اقلام سرشکن می‌شود و در بهای تمام‌شده هر واحد در صفحه فاکتور دیده می‌شود."
    >
      {allocs.length === 0 ? (
        <Empty title="هنوز کالایی به این پارت تخصیص نیافته است">
          از فرم پایین، فاکتور و کالا را انتخاب کنید
        </Empty>
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>فاکتور</th>
                <th>SKU</th>
                <th>شرح</th>
                <th>تعداد کل قلم</th>
                <th>ارسال‌شده / دریافت‌شده</th>
                <th>مغایرت</th>
                <th>سهم از هزینه حمل</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((a) => {
                const share =
                  shipment.total_qty > 0
                    ? (a.qty_shipped / shipment.total_qty) * shipment.freight_cost
                    : 0;
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/invoices/${a.invoice_id}`} className="font-medium hover:underline">
                        {a.invoice_no}
                      </Link>
                    </td>
                    <td>{a.sku ?? "—"}</td>
                    <td className="max-w-56 truncate">{a.description ?? "—"}</td>
                    <td className="num text-[var(--geist-secondary)]">{fq(a.item_qty)}</td>
                    <td>
                      <ActionForm action={updateAllocation} hideResult>
                        {(state) => (
                          <div>
                            <div className="flex items-center gap-1">
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="shipment_id" value={shipment.id} />
                              <NumberInput
                                name="qty_shipped"
                                defaultValue={a.qty_shipped}
                                title="ارسال‌شده"
                                className="!h-8 !w-24"
                              />
                              <NumberInput
                                name="qty_received"
                                defaultValue={a.qty_received}
                                title="دریافت‌شده"
                                className="!h-8 !w-24"
                              />
                              <Submit size="small" variant="secondary">
                                ذخیره
                              </Submit>
                            </div>
                            {state?.error && (
                              <p className="mt-1 max-w-xs whitespace-normal text-xs text-[var(--geist-red-text)]">
                                {state.error}
                              </p>
                            )}
                          </div>
                        )}
                      </ActionForm>
                    </td>
                    <td
                      className={`num ${
                        a.variance > 0
                          ? "text-[var(--geist-amber-text)]"
                          : "text-[var(--geist-tertiary)]"
                      }`}
                    >
                      {fq(a.variance)}
                    </td>
                    <td className="num">{money(share)}</td>
                    <td>
                      <form action={deleteAllocation}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="shipment_id" value={shipment.id} />
                        <Button
                          htmlType="submit"
                          size="tiny"
                          variant="tertiary"
                          className="!text-[var(--geist-red-text)]"
                          confirm="این تخصیص از پارت حذف شود؟"
                        >
                          حذف
                        </Button>
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
        <ActionForm action={createAllocation}>
          <input type="hidden" name="shipment_id" value={shipment.id} />
          <AllocationPicker items={openItems} />
        </ActionForm>
      </div>
    </Card>
  );
}

export function ShipmentEditCard({ shipment }: { shipment: Shipment }) {
  return (
    <Card title="ویرایش پارت">
      <ActionForm action={updateShipment} className="grid gap-4 p-4 sm:grid-cols-3">
        <input type="hidden" name="id" value={shipment.id} />
        <Input name="shipment_no" label="شماره پارت" defaultValue={shipment.shipment_no} required dir="ltr" />
        <Input name="carrier" label="نام کارگو" defaultValue={shipment.carrier ?? ""} />
        <SelectField name="mode" label="نوع حمل" defaultValue={shipment.mode ?? ""} options={MODES} allowEmpty />
        <DateInput name="handover_date" label="تحویل به کارگو" defaultValue={shipment.handover_date} />
        <DateInput name="depart_date" label="تاریخ خروج" defaultValue={shipment.depart_date} />
        <DateInput name="receive_date" label="تاریخ دریافت" defaultValue={shipment.receive_date} />
        <Input name="tracking_no" label="شماره رهگیری" defaultValue={shipment.tracking_no ?? ""} dir="ltr" />
        <NumberInput name="freight_cost" label="هزینه حمل پارت" defaultValue={shipment.freight_cost} />
        <NumberInput name="weight_kg" label="وزن (کیلو)" defaultValue={shipment.weight_kg} />
        <NumberInput name="cbm" label="حجم CBM" defaultValue={shipment.cbm} />
        <div className="sm:col-span-2">
          <Input name="notes" label="توضیحات" defaultValue={shipment.notes ?? ""} />
        </div>
        <div className="sm:col-span-3">
          <Submit>ذخیره تغییرات</Submit>
        </div>
      </ActionForm>
      <form action={deleteShipment} className="border-t border-[var(--geist-border)] p-4">
        <input type="hidden" name="id" value={shipment.id} />
        <Button
          htmlType="submit"
          size="small"
          variant="tertiary"
          className="!text-[var(--geist-red-text)]"
          confirm="این پارت و همه تخصیص‌های آن حذف شود؟"
        >
          حذف این پارت
        </Button>
      </form>
    </Card>
  );
}
