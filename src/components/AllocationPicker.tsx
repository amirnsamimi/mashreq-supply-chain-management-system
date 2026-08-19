"use client";

import { useMemo, useState } from "react";
import { NumberInput } from "./NumberInput";
import { Combobox } from "./Combobox";

export type PickerItem = {
  id: number;
  invoice_no: string;
  sku: string | null;
  description: string | null;
  qty: number;
  remaining: number;
};

/** انتخاب دومرحله‌ای: اول فاکتور، بعد کالای همان فاکتور */
export function AllocationPicker({ items }: { items: PickerItem[] }) {
  const invoices = useMemo(
    () => Array.from(new Set(items.map((i) => i.invoice_no))).sort(),
    [items]
  );
  const [invoice, setInvoice] = useState("");
  const [itemId, setItemId] = useState("");

  const filtered = items.filter((i) => i.invoice_no === invoice);
  const selected = items.find((i) => String(i.id) === itemId);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div>
        <label>فاکتور</label>
        <Combobox
          placeholder="جست‌وجو و انتخاب فاکتور…"
          options={invoices.map((no) => ({ value: no, label: no }))}
          value={invoice}
          onChange={(v) => {
            setInvoice(v);
            setItemId("");
          }}
        />
      </div>

      <div>
        <label>کالا</label>
        <Combobox
          name="item_id"
          disabled={!invoice}
          placeholder={invoice ? "جست‌وجو و انتخاب کالا…" : "اول فاکتور را انتخاب کنید"}
          emptyText="این فاکتور قلمی ندارد"
          options={filtered.map((it) => ({
            value: String(it.id),
            label: it.sku ?? it.description ?? `قلم ${it.id}`,
            hint: `باقی‌مانده ${it.remaining} از ${it.qty}`,
          }))}
          value={itemId}
          onChange={setItemId}
        />
      </div>

      <div>
        <label>تعداد ارسال در این پارت</label>
        <NumberInput key={itemId} name="qty_shipped" defaultValue={selected?.remaining ?? 0} />
      </div>

      <div className="flex items-end">
        <button
          disabled={!itemId}
          className="inline-flex w-full items-center justify-center rounded-[var(--geist-radius)] bg-[var(--geist-foreground)] px-3.5 py-2 text-sm font-medium text-[var(--geist-background)] transition hover:opacity-85 disabled:opacity-40"
        >
          افزودن کالا به پارت
        </button>
      </div>

      {selected && (
        <p className="text-xs text-[var(--geist-tertiary)] md:col-span-4">
          {selected.invoice_no} — {selected.sku ?? selected.description}: تعداد کل{" "}
          <span className="num">{selected.qty}</span>، تاکنون{" "}
          <span className="num">{selected.qty - selected.remaining}</span> تخصیص یافته، باقی‌مانده{" "}
          <span className="num">{selected.remaining}</span>
        </p>
      )}
    </div>
  );
}
