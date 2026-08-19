"use client";

import Link from "next/link";
import { useState } from "react";
import type { Invoice, Item, Product } from "@/lib/queries";
import { money, qty as fq, jalali } from "@/lib/format";
import {
  createAllocation,
  createItem,
  deleteInvoice,
  deleteItem,
  updateInvoice,
  updateItem,
} from "@/lib/actions";
import { CURRENCIES } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import {
  Badge,
  Button,
  Card,
  Combobox,
  DateInput,
  Empty,
  Input,
  Modal,
  NumberInput,
  SelectField,
  Textarea,
} from "@/components/geist";
import { statusTone } from "@/lib/tones";

export type ShipmentOption = { id: number; shipment_no: string; carrier: string | null; status: string };
export type ItemAlloc = {
  id: number;
  shipment_id: number;
  shipment_no: string;
  carrier: string | null;
  receive_date: string | null;
  qty_shipped: number;
  qty_received: number;
};
/* ---------- اقلام ---------- */

export function ItemsCard({
  invoiceId,
  items,
  shipments,
  products,
}: {
  invoiceId: number;
  items: Item[];
  shipments: ShipmentOption[];
  products: Product[];
}) {
  const [shipFor, setShipFor] = useState<Item | null>(null);

  return (
    <>
      <Card
        title={`اقلام فاکتور (${items.length})`}
        action={
          <a href={`/api/export/items?invoice=${invoiceId}`} download>
            <Button size="tiny">خروجی اکسل</Button>
          </a>
        }
      >
        {items.length === 0 ? (
          <Empty title="قلمی ثبت نشده است">از فرم پایین اولین قلم را اضافه کنید</Empty>
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
                    <td
                      className={`num ${
                        it.remaining > 0
                          ? "text-[var(--geist-amber-text)]"
                          : "text-[var(--geist-tertiary)]"
                      }`}
                    >
                      {fq(it.remaining)}
                    </td>
                    <td className="num">{fq(it.in_transit)}</td>
                    <td className="num">{fq(it.received)}</td>
                    <td className="num">{money(it.unit_freight)}</td>
                    <td className="num font-medium">{money(it.landed_unit_cost)}</td>
                    <td>
                      <Badge tone={statusTone(it.status)}>{it.status}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {it.remaining > 0 && shipments.length > 0 && (
                          <Button size="tiny" onClick={() => setShipFor(it)}>
                            ارسال
                          </Button>
                        )}
                        <EditItem item={it} invoiceId={invoiceId} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-[var(--geist-border)] p-4">
          <AddItemForm invoiceId={invoiceId} products={products} />
        </div>
      </Card>

      <AllocateModal item={shipFor} shipments={shipments} onClose={() => setShipFor(null)} />
    </>
  );
}


/** افزودن قلم با انتخاب کالا از فهرست تعریف‌شده */
function AddItemForm({ invoiceId, products }: { invoiceId: number; products: Product[] }) {
  const [productId, setProductId] = useState("");
  const selected = products.find((p) => String(p.id) === productId);
  const active = products.filter((p) => p.is_active || String(p.id) === productId);

  if (products.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[var(--geist-secondary)]">
          هنوز کالایی تعریف نشده است. اول کالاها را در صفحه «کالاها» بسازید.
        </p>
        <Link href="/products">
          <Button size="small" variant="primary">
            رفتن به کالاها
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ActionForm action={createItem} className="grid gap-4 sm:grid-cols-4" resetOnSuccess>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="sm:col-span-2">
        <Combobox
          label="کالا"
          name="product_id"
          placeholder="جست‌وجو در کد یا نام کالا…"
          emptyText="کالایی با این مشخصات نیست"
          options={active.map((p) => ({
            value: String(p.id),
            label: `${p.sku} — ${p.name}`,
            hint: p.last_price === null ? undefined : money(p.last_price),
          }))}
          value={productId}
          onChange={setProductId}
        />
      </div>
      <NumberInput label="تعداد" name="qty" defaultValue={0} />
      <div className="flex items-end gap-2">
        <NumberInput
          key={productId}
          label="قیمت واحد"
          name="unit_price"
          defaultValue={selected?.last_price ?? 0}
        />
        <Submit disabled={!productId}>افزودن</Submit>
      </div>
      {selected && (
        <p className="text-xs text-[var(--geist-tertiary)] sm:col-span-4">
          {selected.name}
          {selected.unit ? ` — واحد: ${selected.unit}` : ""}
          {selected.last_price !== null ? ` — آخرین قیمت: ${money(selected.last_price)}` : ""}
        </p>
      )}
    </ActionForm>
  );
}

function EditItem({ item, invoiceId }: { item: Item; invoiceId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="tiny" variant="tertiary" onClick={() => setOpen(true)}>
        ویرایش
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`ویرایش ${item.sku ?? "قلم"}`}
        description={
          item.allocated > 0
            ? `${item.allocated} عدد از این قلم به پارت‌ها تخصیص یافته؛ تعداد کمتر از آن پذیرفته نمی‌شود.`
            : undefined
        }
        footer={null}
      >
        <ActionForm action={updateItem} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <div className="sm:col-span-2">
            <p className="text-sm">
              <span className="num font-medium">{item.sku}</span>
              <span className="text-[var(--geist-secondary)]"> — {item.description}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--geist-tertiary)]">
              کد و نام کالا از تعریف کالا می‌آید؛ برای تغییرشان به صفحه «کالاها» بروید.
            </p>
          </div>
          <NumberInput name="qty" label="تعداد" defaultValue={item.qty} />
          <NumberInput name="unit_price" label="قیمت واحد" defaultValue={item.unit_price} />
          <div className="flex gap-2 sm:col-span-2">
            <Submit>ذخیره</Submit>
            <Button onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </ActionForm>
        <form action={deleteItem} className="mt-4 border-t border-[var(--geist-border)] pt-4">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <Button
            htmlType="submit"
            size="small"
            variant="tertiary"
            className="!text-[var(--geist-red-text)]"
            confirm="این قلم و تخصیص‌های آن به پارت‌ها حذف شود؟"
          >
            حذف این قلم
          </Button>
        </form>
      </Modal>
    </>
  );
}

/** ارسال یک قلم به پارت، مستقیماً از صفحه فاکتور */
function AllocateModal({
  item,
  shipments,
  onClose,
}: {
  item: Item | null;
  shipments: ShipmentOption[];
  onClose: () => void;
}) {
  const [shipmentId, setShipmentId] = useState("");

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item ? `ارسال ${item.sku ?? item.description ?? "قلم"}` : ""}
      description={item ? `باقی‌مانده برای ارسال: ${item.remaining} از ${item.qty}` : undefined}
      footer={null}
    >
      {item && (
        <ActionForm action={createAllocation} className="grid gap-4">
          <input type="hidden" name="item_id" value={item.id} />
          <input type="hidden" name="shipment_id" value={shipmentId} />
          <Combobox
            label="پارت ارسال"
            placeholder="جست‌وجو و انتخاب پارت…"
            options={shipments.map((s) => ({
              value: String(s.id),
              label: s.shipment_no,
              hint: `${s.carrier ?? "—"} · ${s.status}`,
            }))}
            value={shipmentId}
            onChange={setShipmentId}
          />
          <NumberInput name="qty_shipped" label="تعداد ارسال" defaultValue={item.remaining} />
          <NumberInput name="qty_received" label="تعداد دریافت‌شده (اختیاری)" defaultValue={0} />
          <div className="flex gap-2">
            <Submit disabled={!shipmentId}>افزودن به پارت</Submit>
            <Button onClick={onClose}>انصراف</Button>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

/* ---------- ارسال اقلام ---------- */

export function ItemShipmentsCard({
  items,
  allocsByItem,
}: {
  items: Item[];
  allocsByItem: Record<number, ItemAlloc[]>;
}) {
  const rows = items.flatMap((it) => (allocsByItem[it.id] ?? []).map((a) => ({ it, a })));
  if (rows.length === 0) return null;

  return (
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
            {rows.map(({ it, a }) => (
              <tr key={a.id}>
                <td>{it.sku ?? it.description ?? "—"}</td>
                <td>
                  <Link href={`/shipments/${a.shipment_id}`} className="font-medium hover:underline">
                    {a.shipment_no}
                  </Link>
                </td>
                <td>{a.carrier ?? "—"}</td>
                <td className="num">{fq(a.qty_shipped)}</td>
                <td className="num">{fq(a.qty_received)}</td>
                <td
                  className={`num ${
                    a.qty_shipped - a.qty_received > 0
                      ? "text-[var(--geist-amber-text)]"
                      : "text-[var(--geist-tertiary)]"
                  }`}
                >
                  {fq(a.qty_shipped - a.qty_received)}
                </td>
                <td>{jalali(a.receive_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------- ویرایش فاکتور ---------- */

export function InvoiceEditCard({ inv }: { inv: Invoice }) {
  return (
    <Card title="ویرایش فاکتور">
      <form action={updateInvoice} className="grid gap-4 p-4">
        <input type="hidden" name="id" value={inv.id} />
        <Input name="invoice_no" label="شماره فاکتور" defaultValue={inv.invoice_no} required dir="ltr" />
        <Input name="supplier" label="فروشنده" defaultValue={inv.supplier ?? ""} />
        <DateInput name="invoice_date" label="تاریخ فاکتور" defaultValue={inv.invoice_date} />
        <SelectField name="currency" label="ارز" defaultValue={inv.currency ?? "RMB"} options={CURRENCIES} />
        <NumberInput name="total_amount" label="مبلغ کل فاکتور" defaultValue={inv.total_amount} />
        <DateInput name="due_date" label="تاریخ سررسید" defaultValue={inv.due_date} />
        <Textarea name="notes" label="توضیحات" rows={2} defaultValue={inv.notes ?? ""} />
        <Button htmlType="submit" variant="primary">
          ذخیره تغییرات
        </Button>
      </form>
      <form action={deleteInvoice} className="border-t border-[var(--geist-border)] p-4">
        <input type="hidden" name="id" value={inv.id} />
        <Button
          htmlType="submit"
          size="small"
          variant="tertiary"
          className="!text-[var(--geist-red-text)]"
          confirm="کل فاکتور با همه اقلام، تخصیص‌ها و پرداخت‌هایش حذف شود؟ این کار برگشت‌پذیر نیست."
        >
          حذف فاکتور و همه اقلام و پرداخت‌های آن
        </Button>
      </form>
    </Card>
  );
}
