"use client";

import Link from "next/link";
import type { PaymentRow } from "@/lib/queries";
import type { Paged } from "@/lib/paging";
import { money } from "@/lib/format";
import { deletePayment } from "@/lib/actions";
import { Button, Card, DataTable } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { DateText } from "@/components/DateText";

export function PaymentsClient({ page }: { page: Paged<PaymentRow> }) {
  const payments = page.rows;

  const columns: Column<PaymentRow>[] = [
    {
      key: "payment_date",
      header: "تاریخ پرداخت",
      value: (r) => r.payment_date,
      render: (r) => <DateText value={r.payment_date} />,
      total: (rows) => `جمع این صفحه (${rows.length} پرداخت)`,
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
          <input type="hidden" name="id" value={r.payment_id} />
          <Button
            htmlType="submit"
            size="tiny"
            variant="tertiary"
            className="!text-[var(--geist-red-text)]"
            confirm={
              r.invoice_count > 1
                ? `این پرداخت بین ${r.invoice_count} فاکتور تقسیم شده؛ حذف آن، تخصیص به همه آن فاکتورها را پاک می‌کند. ادامه؟`
                : `پرداخت ${money(r.amount)} فاکتور ${r.invoice_no} حذف شود؟`
            }
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
        server={page}
        searchPlaceholder="جست‌وجو در فاکتور، فروشنده، روش یا مرجع…"
        emptyTitle="هنوز پرداختی ثبت نشده است"
        emptyHint="با دکمه «ثبت پرداخت» شروع کنید"
        emptyAction={
          <Link href="/payments/new">
            <Button variant="primary" size="small">
              ثبت پرداخت
            </Button>
          </Link>
        }
        toolbar={
          <a href="/api/export/payments" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
    </Card>
  );
}

export function NewPaymentTrigger() {
  return (
    <Link href="/payments/new">
      <Button variant="primary">+ ثبت پرداخت</Button>
    </Link>
  );
}
