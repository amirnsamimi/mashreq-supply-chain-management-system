"use client";

import Link from "next/link";
import { useState } from "react";
import type { Invoice, PaymentRow } from "@/lib/queries";
import { money } from "@/lib/format";
import { createPayment, deletePayment } from "@/lib/actions";
import { PAY_METHODS } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import {
  Badge,
  Button,
  Card,
  Combobox,
  DataTable,
  DateInput,
  Input,
  Modal,
  NumberInput,
  Note,
  SelectField,
} from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { statusTone } from "@/lib/tones";
import { DateText } from "@/components/DateText";

export function PaymentsClient({
  payments,
  invoices,
}: {
  payments: PaymentRow[];
  invoices: Invoice[];
}) {
  const [open, setOpen] = useState(false);

  const columns: Column<PaymentRow>[] = [
    {
      key: "payment_date",
      header: "تاریخ پرداخت",
      value: (r) => r.payment_date,
      render: (r) => <DateText value={r.payment_date} />,
      total: (rows) => `${rows.length} پرداخت`,
    },
    {
      key: "invoice_no",
      header: "فاکتور",
      value: (r) => r.invoice_no,
      render: (r) => (
        <Link href={`/invoices/${r.invoice_id}`} className="font-medium hover:underline">
          {r.invoice_no}
        </Link>
      ),
    },
    { key: "supplier", header: "فروشنده", value: (r) => r.supplier },
    {
      key: "amount",
      header: "مبلغ",
      value: (r) => r.amount,
      render: (r) => (
        <span className="num font-medium">
          {money(r.amount)} <span className="text-[var(--geist-tertiary)]">{r.currency}</span>
        </span>
      ),
      total: (rows) => {
        // جمع فقط وقتی معنا دارد که ارز یکی باشد
        const curs = new Set(rows.map((r) => r.currency ?? "—"));
        const sum = rows.reduce((s, r) => s + r.amount, 0);
        return (
          <span className="num">
            {money(sum)}
            {curs.size > 1 && (
              <span className="mr-1 text-[0.65rem] font-normal text-[var(--geist-tertiary)]">
                (ارز مختلط)
              </span>
            )}
          </span>
        );
      },
    },
    { key: "method", header: "روش", value: (r) => r.method },
    { key: "reference", header: "مرجع/رسید", value: (r) => r.reference },
    { key: "notes", header: "توضیحات", value: (r) => r.notes },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (r) => (
        <form action={deletePayment}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="invoice_id" value={r.invoice_id} />
          <Button
            htmlType="submit"
            size="tiny"
            variant="tertiary"
            className="!text-[var(--geist-red-text)]"
            confirm={`پرداخت ${money(r.amount)} فاکتور ${r.invoice_no} حذف شود؟`}
          >
            حذف
          </Button>
        </form>
      ),
    },
  ];

  return (
    <Card>
      <DataTable
        rows={payments}
        columns={columns}
        searchPlaceholder="جست‌وجو در فاکتور، فروشنده، روش یا مرجع…"
        emptyTitle="هنوز پرداختی ثبت نشده است"
        emptyHint="با دکمه «ثبت پرداخت» شروع کنید"
        emptyAction={
          <Button variant="primary" size="small" onClick={() => setOpen(true)}>
            ثبت پرداخت
          </Button>
        }
        toolbar={
          <a href="/api/export/payments" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
      <NewPaymentModal open={open} setOpen={setOpen} invoices={invoices} />
    </Card>
  );
}

export function NewPaymentModal({
  open,
  setOpen,
  invoices,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  invoices: Invoice[];
}) {
  const [invoiceId, setInvoiceId] = useState("");
  const selected = invoices.find((i) => String(i.id) === invoiceId);
  // فاکتورهای بدهکار اول فهرست باشند
  const sorted = [...invoices].sort((a, b) => b.balance - a.balance);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="ثبت پرداخت"
      description="اول فاکتور را انتخاب کنید؛ مانده‌اش را همین‌جا می‌بینید."
      footer={null}
      width={620}
    >
      <ActionForm action={createPayment} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <div className="sm:col-span-2">
          <Combobox
            label="فاکتور"
            placeholder="جست‌وجو در شماره فاکتور یا فروشنده…"
            emptyText="فاکتوری پیدا نشد"
            options={sorted.map((i) => ({
              value: String(i.id),
              label: `${i.invoice_no}${i.supplier ? ` — ${i.supplier}` : ""}`,
              hint: `مانده ${money(i.balance)} ${i.currency ?? ""}`,
            }))}
            value={invoiceId}
            onChange={setInvoiceId}
          />
        </div>

        {selected && (
          <div className="sm:col-span-2">
            <Note type={selected.balance > 0 ? "warning" : "success"}>
              فاکتور {selected.invoice_no} — مبلغ کل {money(selected.total_amount)}{" "}
              {selected.currency}، پرداخت‌شده {money(selected.paid)}، مانده{" "}
              <b>
                {money(selected.balance)} {selected.currency}
              </b>{" "}
              <Badge tone={statusTone(selected.payment_status)}>{selected.payment_status}</Badge>
            </Note>
          </div>
        )}

        <DateInput name="payment_date" label="تاریخ پرداخت" />
        <NumberInput
          key={invoiceId}
          name="amount"
          label={`مبلغ${selected?.currency ? ` (${selected.currency})` : ""}`}
          defaultValue={selected?.balance ?? 0}
        />
        <SelectField name="method" label="روش پرداخت" defaultValue={PAY_METHODS[0]} options={PAY_METHODS} />
        <Input name="reference" label="مرجع/رسید" />
        <div className="sm:col-span-2">
          <Input name="notes" label="توضیحات" />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Submit disabled={!invoiceId}>ثبت پرداخت</Submit>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}

export function NewPaymentTrigger({ invoices }: { invoices: Invoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + ثبت پرداخت
      </Button>
      <NewPaymentModal open={open} setOpen={setOpen} invoices={invoices} />
    </>
  );
}
