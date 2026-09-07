"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Invoice, PaymentRow, Supplier } from "@/lib/queries";
import type { Paged } from "@/lib/paging";
import { money, balanceLabel } from "@/lib/format";
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
import { useOpenParam } from "@/components/useOpenParam";

export function PaymentsClient({
  page,
  invoices,
  suppliers,
}: {
  page: Paged<PaymentRow>;
  invoices: Invoice[];
  suppliers: Supplier[];
}) {
  const payments = page.rows;
  const [open, setOpen] = useState(false);

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
      <NewPaymentModal open={open} setOpen={setOpen} invoices={invoices} suppliers={suppliers} />
    </Card>
  );
}

/** مقدار انتخابی برای گروه فاکتورهای بدون تأمین‌کننده (داده‌های قدیمی) */
const NO_SUPPLIER = "__none__";

export function NewPaymentModal({
  open,
  setOpen,
  invoices,
  suppliers,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  invoices: Invoice[];
  suppliers: Supplier[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const noSupplierCount = useMemo(() => invoices.filter((i) => i.supplier_id == null).length, [invoices]);

  const supplierOptions = useMemo(() => {
    const opts = suppliers
      .filter((sup) => sup.invoice_count > 0)
      .sort((a, b) => b.balance - a.balance)
      .map((sup) => ({
        value: String(sup.id),
        label: sup.name,
        hint: `${sup.invoice_count} فاکتور — مانده ${balanceLabel(sup.balance)}`,
      }));
    if (noSupplierCount > 0) {
      opts.push({
        value: NO_SUPPLIER,
        label: "بدون تأمین‌کننده",
        hint: `${noSupplierCount} فاکتور بدون تأمین‌کننده ثبت‌شده`,
      });
    }
    return opts;
  }, [suppliers, noSupplierCount]);

  const supplierInvoices = useMemo(() => {
    if (!supplierId) return [];
    const list =
      supplierId === NO_SUPPLIER
        ? invoices.filter((i) => i.supplier_id == null)
        : invoices.filter((i) => i.supplier_id === Number(supplierId));
    // سررسید نزدیک‌تر اول، چون معمولاً همان‌ها باید زودتر پرداخت شوند
    return [...list].sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  }, [invoices, supplierId]);

  function selectSupplier(v: string) {
    setSupplierId(v);
    setChecked(new Set());
  }

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const checkedInvoices = supplierInvoices.filter((i) => checked.has(i.id));
  const mixedCurrency = new Set(checkedInvoices.map((i) => i.currency)).size > 1;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="ثبت پرداخت"
      description="اول تأمین‌کننده را انتخاب کنید، بعد فاکتورهایی را که همین حالا پرداخت می‌شوند تیک بزنید — لازم نیست همه با هم پرداخت شوند."
      footer={null}
      width={720}
    >
      <ActionForm action={createPayment} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="supplier_id" value={supplierId === NO_SUPPLIER ? "" : supplierId} />
        <div className="sm:col-span-2">
          <Combobox
            label="تأمین‌کننده"
            placeholder={supplierOptions.length ? "جست‌وجو و انتخاب تأمین‌کننده…" : "فاکتوری برای پرداخت وجود ندارد"}
            emptyText="تأمین‌کننده‌ای پیدا نشد"
            disabled={supplierOptions.length === 0}
            options={supplierOptions}
            value={supplierId}
            onChange={selectSupplier}
          />
        </div>

        {supplierId && (
          <div className="sm:col-span-2">
            {supplierInvoices.length === 0 ? (
              <Note type="warning">این تأمین‌کننده فاکتوری ندارد</Note>
            ) : (
              <div className="scroll-x rounded-md border border-[var(--geist-border)]">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>فاکتور</th>
                      <th>سررسید</th>
                      <th>مانده</th>
                      <th>مبلغ این پرداخت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierInvoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <input type="checkbox" checked={checked.has(i.id)} onChange={() => toggle(i.id)} />
                          {checked.has(i.id) && <input type="hidden" name="invoice_id" value={i.id} />}
                        </td>
                        <td>
                          {i.invoice_no}{" "}
                          <Badge tone={statusTone(i.payment_status)}>{i.payment_status}</Badge>
                        </td>
                        <td>{i.due_date ? <DateText value={i.due_date} /> : "—"}</td>
                        <td className="num">
                          {balanceLabel(i.balance)} {i.currency}
                        </td>
                        <td>
                          {checked.has(i.id) ? (
                            <NumberInput key={i.id} name="amount" defaultValue={Math.max(0, i.balance)} />
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {mixedCurrency && (
              <div className="mt-2">
                <Note type="error">فاکتورهای انتخاب‌شده ارزهای متفاوتی دارند؛ فقط فاکتورهای هم‌ارز را با هم پرداخت کنید</Note>
              </div>
            )}
          </div>
        )}

        <DateInput name="payment_date" label="تاریخ پرداخت" />
        <SelectField name="method" label="روش پرداخت" defaultValue={PAY_METHODS[0]} options={PAY_METHODS} />
        <Input name="reference" label="مرجع/رسید" />
        <div className="sm:col-span-2">
          <Input name="notes" label="توضیحات" />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Submit disabled={checkedInvoices.length === 0 || mixedCurrency}>ثبت پرداخت</Submit>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}

export function NewPaymentTrigger({ invoices, suppliers }: { invoices: Invoice[]; suppliers: Supplier[] }) {
  const [open, setOpen] = useOpenParam("payment");
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + ثبت پرداخت
      </Button>
      <NewPaymentModal open={open} setOpen={setOpen} invoices={invoices} suppliers={suppliers} />
    </>
  );
}
