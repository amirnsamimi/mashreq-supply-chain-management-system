"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Invoice, Supplier } from "@/lib/queries";
import { balanceLabel, money } from "@/lib/format";
import { createPayment } from "@/lib/actions";
import { PAY_METHODS } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, Combobox, DateInput, Input, NumberInput, Note, SelectField } from "@/components/geist";
import { statusTone } from "@/lib/tones";
import { DateText } from "@/components/DateText";

/** مقدار انتخابی برای گروه فاکتورهای بدون تأمین‌کننده (داده‌های قدیمی) */
const NO_SUPPLIER = "__none__";
const BROWSE_PAGE_SIZE = 8;

export function NewPaymentForm({
  invoices,
  suppliers,
  initialSupplierId = "",
}: {
  invoices: Invoice[];
  suppliers: Supplier[];
  initialSupplierId?: string;
}) {
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

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

  // با عوض شدن تأمین‌کننده، انتخاب و جست‌وجو و صفحه از نو شروع شود
  useEffect(() => {
    setChecked(new Set());
    setSearch("");
    setPage(0);
  }, [supplierId]);

  function selectSupplier(v: string) {
    setSupplierId(v);
  }

  function check(id: number) {
    setChecked((prev) => new Set(prev).add(id));
  }

  function uncheck(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const checkedInvoices = supplierInvoices.filter((i) => checked.has(i.id));
  const mixedCurrency = new Set(checkedInvoices.map((i) => i.currency)).size > 1;
  const checkedTotal = checkedInvoices.reduce((s, i) => s + Math.max(0, i.balance), 0);

  // فاکتورهای انتخاب‌نشده برای مرور و افزودن؛ همین‌جا صفحه‌بندی می‌شوند تا فهرست بلند شلوغ نشود
  const browsable = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return supplierInvoices.filter(
      (i) => !checked.has(i.id) && (!needle || i.invoice_no.toLowerCase().includes(needle))
    );
  }, [supplierInvoices, checked, search]);

  const pageCount = Math.max(1, Math.ceil(browsable.length / BROWSE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = browsable.slice(currentPage * BROWSE_PAGE_SIZE, (currentPage + 1) * BROWSE_PAGE_SIZE);

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <Combobox
          label="تأمین‌کننده"
          placeholder={supplierOptions.length ? "جست‌وجو و انتخاب تأمین‌کننده…" : "فاکتوری برای پرداخت وجود ندارد"}
          emptyText="تأمین‌کننده‌ای پیدا نشد"
          disabled={supplierOptions.length === 0}
          options={supplierOptions}
          value={supplierId}
          onChange={selectSupplier}
        />
      </Card>

      {supplierId && (
        <ActionForm action={createPayment} className="grid gap-6">
          <input type="hidden" name="supplier_id" value={supplierId === NO_SUPPLIER ? "" : supplierId} />

          <Card title={`فاکتورهای انتخاب‌شده برای این پرداخت (${checkedInvoices.length})`}>
            {checkedInvoices.length === 0 ? (
              <div className="p-4 text-sm text-[var(--geist-secondary)]">
                از فهرست پایین، فاکتورهایی را که همین حالا پرداخت می‌شوند اضافه کنید.
              </div>
            ) : (
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>فاکتور</th>
                      <th>سررسید</th>
                      <th>مانده</th>
                      <th>مبلغ این پرداخت</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkedInvoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          {i.invoice_no} <Badge tone={statusTone(i.payment_status)}>{i.payment_status}</Badge>
                        </td>
                        <td>{i.due_date ? <DateText value={i.due_date} /> : "—"}</td>
                        <td className="num">
                          {balanceLabel(i.balance)} {i.currency}
                        </td>
                        <td>
                          <input type="hidden" name="invoice_id" value={i.id} />
                          <NumberInput name="amount" defaultValue={Math.max(0, i.balance)} />
                        </td>
                        <td>
                          <Button size="tiny" variant="tertiary" onClick={() => uncheck(i.id)}>
                            حذف
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {mixedCurrency && (
              <div className="p-4 pt-0">
                <Note type="error">
                  فاکتورهای انتخاب‌شده ارزهای متفاوتی دارند؛ فقط فاکتورهای هم‌ارز را با هم پرداخت کنید
                </Note>
              </div>
            )}
          </Card>

          <Card title={`فاکتورهای این تأمین‌کننده (${browsable.length})`}>
            <div className="border-b border-[var(--geist-border)] p-3">
              <Input
                size="small"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="جست‌وجو در شماره فاکتور…"
              />
            </div>
            {pageRows.length === 0 ? (
              <div className="p-4 text-sm text-[var(--geist-secondary)]">
                {browsable.length === 0 && supplierInvoices.length > 0
                  ? "همه فاکتورهای این تأمین‌کننده انتخاب شده‌اند"
                  : "فاکتوری پیدا نشد"}
              </div>
            ) : (
              <>
                <div className="scroll-x">
                  <table>
                    <thead>
                      <tr>
                        <th>فاکتور</th>
                        <th>سررسید</th>
                        <th>مانده</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((i) => (
                        <tr key={i.id}>
                          <td>
                            {i.invoice_no} <Badge tone={statusTone(i.payment_status)}>{i.payment_status}</Badge>
                          </td>
                          <td>{i.due_date ? <DateText value={i.due_date} /> : "—"}</td>
                          <td className="num">
                            {balanceLabel(i.balance)} {i.currency}
                          </td>
                          <td>
                            <Button size="tiny" onClick={() => check(i.id)}>
                              افزودن
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--geist-border)] p-3 text-sm text-[var(--geist-secondary)]">
                    <span>
                      صفحه {currentPage + 1} از {pageCount}
                    </span>
                    <div className="flex gap-2">
                      <Button size="tiny" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
                        قبلی
                      </Button>
                      <Button
                        size="tiny"
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                        disabled={currentPage >= pageCount - 1}
                      >
                        بعدی
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="grid gap-4 p-4 sm:grid-cols-2">
            <DateInput name="payment_date" label="تاریخ پرداخت" />
            <SelectField name="method" label="روش پرداخت" defaultValue={PAY_METHODS[0]} options={PAY_METHODS} />
            <Input name="reference" label="مرجع/رسید" />
            <div className="sm:col-span-2">
              <Input name="notes" label="توضیحات" />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Submit disabled={checkedInvoices.length === 0 || mixedCurrency}>
                {checkedInvoices.length > 0
                  ? `ثبت پرداخت (${checkedInvoices.length} فاکتور — ${money(checkedTotal)})`
                  : "ثبت پرداخت"}
              </Submit>
              <Link href="/payments">
                <Button>انصراف</Button>
              </Link>
            </div>
          </Card>
        </ActionForm>
      )}
    </div>
  );
}
