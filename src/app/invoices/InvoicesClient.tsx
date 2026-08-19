"use client";

import Link from "next/link";
import { useState } from "react";
import type { Invoice, Supplier } from "@/lib/queries";
import { money, jalali } from "@/lib/format";
import { createInvoice } from "@/lib/actions";
import { CURRENCIES } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, Combobox, DataTable, DateInput, Input, Modal, NumberInput, SelectField } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { statusTone } from "@/lib/tones";

export function InvoicesClient({
  invoices,
  suppliers,
}: {
  invoices: Invoice[];
  suppliers: Supplier[];
}) {
  const [open, setOpen] = useState(false);

  const columns: Column<Invoice>[] = [
    {
      key: "invoice_no",
      header: "شماره فاکتور",
      value: (r) => r.invoice_no,
      render: (r) => (
        <Link href={`/invoices/${r.id}`} className="font-medium hover:underline">
          {r.invoice_no}
        </Link>
      ),
      total: (rows) => `جمع ${rows.length} فاکتور`,
    },
    { key: "supplier", header: "فروشنده", value: (r) => r.supplier },
    { key: "invoice_date", header: "تاریخ", value: (r) => r.invoice_date, render: (r) => jalali(r.invoice_date) },
    { key: "currency", header: "ارز", value: (r) => r.currency },
    {
      key: "total_amount",
      header: "مبلغ کل",
      value: (r) => r.total_amount,
      render: (r) => <span className="num">{money(r.total_amount)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.total_amount, 0))}</span>,
    },
    {
      key: "items_total",
      header: "جمع اقلام",
      value: (r) => r.items_total,
      render: (r) => <span className="num">{money(r.items_total)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.items_total, 0))}</span>,
    },
    {
      key: "diff",
      header: "اختلاف",
      value: (r) => r.diff,
      render: (r) => (
        <span
          className={`num ${
            Math.abs(r.diff) > 0.01
              ? "font-medium text-[var(--geist-red-text)]"
              : "text-[var(--geist-tertiary)]"
          }`}
        >
          {money(r.diff)}
        </span>
      ),
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.diff, 0))}</span>,
    },
    {
      key: "paid",
      header: "پرداختی",
      value: (r) => r.paid,
      render: (r) => <span className="num text-[var(--geist-green-text)]">{money(r.paid)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.paid, 0))}</span>,
    },
    {
      key: "balance",
      header: "مانده",
      value: (r) => r.balance,
      render: (r) => <span className="num font-medium">{money(r.balance)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.balance, 0))}</span>,
    },
    { key: "due_date", header: "سررسید", value: (r) => r.due_date, render: (r) => jalali(r.due_date) },
    {
      key: "payment_status",
      header: "وضعیت پرداخت",
      value: (r) => r.payment_status,
      render: (r) => <Badge tone={statusTone(r.payment_status)}>{r.payment_status}</Badge>,
    },
    {
      key: "invoice_status",
      header: "وضعیت",
      value: (r) => r.invoice_status,
      render: (r) => <Badge tone={statusTone(r.invoice_status)}>{r.invoice_status}</Badge>,
    },
  ];

  return (
    <>
      <Card>
        <DataTable
          rows={invoices}
          columns={columns}
          searchPlaceholder="جست‌وجو در فاکتورها…"
          emptyTitle="هنوز فاکتوری ثبت نشده است"
          emptyHint="با دکمه «فاکتور جدید» شروع کنید"
          emptyAction={
            <Button variant="primary" size="small" onClick={() => setOpen(true)}>
              فاکتور جدید
            </Button>
          }
          toolbar={
            <a href="/api/export/invoices" download>
              <Button size="small" variant="secondary">
                خروجی اکسل
              </Button>
            </a>
          }
        />
      </Card>

      <NewInvoiceButton open={open} setOpen={setOpen} suppliers={suppliers} />
    </>
  );
}

export function NewInvoiceButton({
  open,
  setOpen,
  suppliers,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  suppliers: Supplier[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const active = suppliers.filter((s) => s.is_active);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="فاکتور جدید" footer={null} width={640}>
      <ActionForm action={createInvoice} className="grid gap-4 sm:grid-cols-2">
        {(state) => (
          <>
            <Input name="invoice_no" label="شماره فاکتور" required placeholder="INV-001" dir="ltr" />
            <Combobox
              label="تأمین‌کننده"
              name="supplier_id"
              placeholder={
                suppliers.length ? "جست‌وجو و انتخاب تأمین‌کننده…" : "اول در «تأمین‌کنندگان» تعریف کنید"
              }
              emptyText="تأمین‌کننده‌ای پیدا نشد"
              disabled={suppliers.length === 0}
              options={active.map((s) => ({
                value: String(s.id),
                label: s.name,
                hint: s.country ?? undefined,
              }))}
              value={supplierId}
              onChange={setSupplierId}
            />
            <DateInput name="invoice_date" label="تاریخ فاکتور" />
            <SelectField name="currency" label="ارز" defaultValue="RMB" options={CURRENCIES} />
            <NumberInput name="total_amount" label="مبلغ کل فاکتور" defaultValue={0} />
            <DateInput name="due_date" label="تاریخ سررسید" />
            <div className="sm:col-span-2">
              <Input name="notes" label="توضیحات" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Submit>ثبت فاکتور</Submit>
              <Button onClick={() => setOpen(false)}>انصراف</Button>
              {state?.ok && <span className="self-center text-xs text-[var(--geist-green-text)]">{state.ok}</span>}
            </div>
          </>
        )}
      </ActionForm>
    </Modal>
  );
}
