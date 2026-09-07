"use client";

import Link from "next/link";
import { jalali, money, balanceLabel } from "@/lib/format";
import { deletePayment } from "@/lib/actions";
import { Button, Card, Empty } from "@/components/geist";
import { DateText } from "@/components/DateText";

type Payment = {
  id: number;
  payment_id: number;
  payment_date: string | null;
  amount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  invoice_count: number;
};

/** فهرست پرداخت‌های همین فاکتور — ثبت پرداخت جدید در صفحه «پرداخت‌ها» انجام می‌شود */
export function InvoicePaymentsCard({
  invoiceNo,
  payments,
  balance,
  currency,
}: {
  invoiceNo: string;
  payments: Payment[];
  balance: number;
  currency: string;
}) {
  return (
    <Card
      title={`پرداخت‌ها (${payments.length})`}
      className="lg:col-span-2"
      action={
        <Link href="/payments">
          <Button size="tiny" variant="primary">
            ثبت پرداخت
          </Button>
        </Link>
      }
      footer={`مانده فاکتور ${invoiceNo}: ${balanceLabel(balance)} ${currency}`}
    >
      {payments.length === 0 ? (
        <Empty title="پرداختی ثبت نشده است">
          از صفحه «پرداخت‌ها» می‌توانید برای این فاکتور پرداخت ثبت کنید
        </Empty>
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>مبلغ</th>
                <th>روش</th>
                <th>مرجع/رسید</th>
                <th>توضیحات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{<DateText value={p.payment_date} />}</td>
                  <td className="num font-medium">{money(p.amount)}</td>
                  <td>{p.method ?? "—"}</td>
                  <td>{p.reference ?? "—"}</td>
                  <td className="text-[var(--geist-secondary)]">{p.notes ?? "—"}</td>
                  <td>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.payment_id} />
                      <Button
                        htmlType="submit"
                        size="tiny"
                        variant="tertiary"
                        className="!text-[var(--geist-red-text)]"
                        confirm={
                          p.invoice_count > 1
                            ? `این پرداخت بین ${p.invoice_count} فاکتور تقسیم شده؛ حذف آن، تخصیص به همه آن فاکتورها را پاک می‌کند. ادامه؟`
                            : "این پرداخت حذف شود؟"
                        }
                      >
                        حذف
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
