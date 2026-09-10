"use client";

import Link from "next/link";
import type { TransferRow } from "@/lib/queries";
import { money } from "@/lib/format";
import { deletePayment } from "@/lib/actions";
import { Button, Card, DataTable } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { DateText } from "@/components/DateText";

/** پول واقعی که به تأمین‌کنندگان منتقل شده — همان چیزی که با صورت‌حساب بانک تطبیق می‌خورد */
export function TransfersClient({ transfers }: { transfers: TransferRow[] }) {
  const columns: Column<TransferRow>[] = [
    {
      key: "payment_date",
      header: "تاریخ",
      value: (r) => r.payment_date,
      render: (r) => <DateText value={r.payment_date} />,
      total: (rows) => `جمع این صفحه (${rows.length} انتقال)`,
    },
    {
      key: "supplier",
      header: "تأمین‌کننده",
      value: (r) => r.supplier,
      render: (r) => (
        <Link href={`/suppliers?q=${encodeURIComponent(r.supplier)}`} className="font-medium hover:underline">
          {r.supplier}
        </Link>
      ),
    },
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
        const curs = new Set(rows.map((r) => r.currency ?? "—"));
        const sum = rows.reduce((s, r) => s + r.amount, 0);
        return (
          <span className="num">
            {money(sum)}
            {curs.size > 1 && (
              <span className="mr-1 text-[0.65rem] font-normal text-[var(--geist-tertiary)]">(ارز مختلط)</span>
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
          <Button
            htmlType="submit"
            size="tiny"
            variant="tertiary"
            className="!text-[var(--geist-red-text)]"
            confirm={`این انتقال ${money(r.amount)} ${r.currency} به ${r.supplier} حذف شود؟ اعتبار مصرف‌نشده‌اش هم از کیف‌پول کم می‌شود.`}
          >
            حذف
          </Button>
        </form>
      ),
    },
  ];

  return (
    <Card
      title="انتقال‌ها به تأمین‌کنندگان"
      footer="فقط پول واقعی که به یک تأمین‌کننده منتقل شده اینجاست — تخصیص آن به فاکتورها جدول جداگانه‌ای دارد."
    >
      <DataTable
        rows={transfers}
        columns={columns}
        searchPlaceholder="جست‌وجو در تأمین‌کننده، روش یا مرجع…"
        emptyTitle="هنوز انتقالی ثبت نشده است"
        emptyHint="با دکمه «شارژ کیف‌پول» شروع کنید"
        emptyAction={
          <Link href="/payments/charge">
            <Button variant="primary" size="small">
              شارژ کیف‌پول
            </Button>
          </Link>
        }
        toolbar={
          <a href="/api/export/transfers" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
    </Card>
  );
}
