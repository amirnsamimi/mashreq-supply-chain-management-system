"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Invoice, Supplier } from "@/lib/queries";
import type { FormResult } from "@/lib/actions";
import { balanceLabel, money } from "@/lib/format";
import { createPayment } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, Combobox, DateInput, Input, Note } from "@/components/geist";
import { controlBase, controlBorder } from "@/components/geist/Input";
import { statusTone } from "@/lib/tones";
import { DateText } from "@/components/DateText";

const BROWSE_PAGE_SIZE = 8;

/**
 * فیلد اعتبار هر ردیف کنترل‌شده است، ولی اگر بعد از یک تسویه موفق فاکتورهای انتخاب‌شده
 * را پاک نکنیم، در تسویه بعدی همان صفحه ممکن است دوباره (و اشتباه) ارسال شود.
 */
function SuccessReset({ state, onSuccess }: { state: FormResult; onSuccess: () => void }) {
  // با شیء state (نه رشته state.ok) مقایسه می‌کنیم چون پیام موفقیت هر بار همان متن ثابت است
  const last = useRef<FormResult>(null);
  useEffect(() => {
    if (state?.ok && state !== last.current) {
      last.current = state;
      onSuccess();
    }
  }, [state, onSuccess]);
  return null;
}

/**
 * تسویه فاکتور از محل اعتبار کیف‌پول. پول تازه اینجا وارد سیستم نمی‌شود — تنها راه
 * ورود پول واقعی «شارژ کیف‌پول» است؛ اینجا فقط انتخاب می‌کنید همان اعتبار روی کدام
 * فاکتور(ها) مصرف شود.
 */
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
  /** مبلغی که از کیف‌پول برای هر فاکتور انتخاب شده */
  const [creditAmounts, setCreditAmounts] = useState<Record<number, number>>({});

  const supplierOptions = useMemo(
    () =>
      suppliers
        .filter((sup) => sup.invoice_count > 0)
        .sort((a, b) => b.balance - a.balance)
        .map((sup) => {
          const wallet = sup.wallet_balances.map((w) => `${money(w.balance)} ${w.currency}`).join("، ");
          return {
            value: String(sup.id),
            label: sup.name,
            hint: `${sup.invoice_count} فاکتور — مانده ${balanceLabel(sup.balance)}${wallet ? ` — اعتبار: ${wallet}` : " — بدون اعتبار"}`,
          };
        }),
    [suppliers]
  );

  const selectedSupplier = suppliers.find((sup) => String(sup.id) === supplierId);

  const supplierInvoices = useMemo(() => {
    if (!supplierId) return [];
    const list = invoices.filter((i) => i.supplier_id === Number(supplierId));
    // سررسید نزدیک‌تر اول، چون معمولاً همان‌ها باید زودتر تسویه شوند
    return [...list].sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  }, [invoices, supplierId]);

  // با عوض شدن تأمین‌کننده، انتخاب و جست‌وجو و صفحه از نو شروع شود
  useEffect(() => {
    setChecked(new Set());
    setSearch("");
    setPage(0);
    setCreditAmounts({});
  }, [supplierId]);

  function selectSupplier(v: string) {
    setSupplierId(v);
  }

  function uncheck(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setCreditAmounts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setCredit(id: number, amount: number) {
    setCreditAmounts((prev) => {
      if (amount <= 0) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: amount };
    });
  }

  const checkedInvoices = supplierInvoices.filter((i) => checked.has(i.id));
  const mixedCurrency = new Set(checkedInvoices.map((i) => i.currency)).size > 1;
  const creditUsedTotal = Object.values(creditAmounts).reduce((s, v) => s + v, 0);

  // اعتبار کیف‌پول فقط برای ارز فاکتورهای همین تسویه معنا دارد — اعتبار یک ارز نباید فاکتور ارز دیگر را پوشش دهد
  const activeCurrency = !mixedCurrency ? checkedInvoices[0]?.currency ?? null : null;
  const walletBalance =
    activeCurrency && selectedSupplier
      ? selectedSupplier.wallet_balances.find((w) => w.currency === activeCurrency)?.balance ?? 0
      : 0;
  const walletRemaining = Math.max(0, walletBalance - creditUsedTotal);

  function check(i: Invoice) {
    setChecked((prev) => new Set(prev).add(i.id));
    // پیشنهاد خودکار: تا سقف مانده فاکتور یا اعتبار باقی‌مانده، هرکدام کمتر بود
    const currentlyUsableWallet =
      selectedSupplier?.wallet_balances.find((w) => w.currency === i.currency)?.balance ?? 0;
    const alreadyUsed = Object.values(creditAmounts).reduce((s, v) => s + v, 0);
    const remaining = Math.max(0, currentlyUsableWallet - alreadyUsed);
    const suggestion = Math.min(i.balance, remaining);
    if (suggestion > 0.005) setCredit(i.id, suggestion);
  }

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

  function resetSelection() {
    setChecked(new Set());
    setCreditAmounts({});
    setSearch("");
    setPage(0);
  }

  const hasAnyWallet = selectedSupplier?.wallet_balances.some((w) => w.balance > 0.005) ?? false;

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <Combobox
          label="تأمین‌کننده"
          placeholder={supplierOptions.length ? "جست‌وجو و انتخاب تأمین‌کننده…" : "فاکتوری برای تسویه وجود ندارد"}
          emptyText="تأمین‌کننده‌ای پیدا نشد"
          disabled={supplierOptions.length === 0}
          options={supplierOptions}
          value={supplierId}
          onChange={selectSupplier}
        />
      </Card>

      {supplierId && !hasAnyWallet && (
        <Note type="warning">
          این تأمین‌کننده در حال حاضر اعتباری در کیف‌پول ندارد. برای تسویه فاکتورهایش، اول باید مبلغی به
          کیف‌پولش واریز کنید.{" "}
          <Link href={`/payments/charge?supplier=${supplierId}`} className="underline">
            رفتن به شارژ کیف‌پول
          </Link>
        </Note>
      )}

      {supplierId && (
        <ActionForm action={createPayment} className="grid gap-6">
          {(state) => (
            <>
              <SuccessReset state={state} onSuccess={resetSelection} />
              <input type="hidden" name="supplier_id" value={supplierId} />

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
                                <Button size="tiny" onClick={() => check(i)}>
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
                          <Button
                            size="tiny"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >
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

              <Card title={`فاکتورهای انتخاب‌شده برای این تسویه (${checkedInvoices.length})`}>
                {activeCurrency && (
                  <div className="p-4 pb-0">
                    <Note type={walletBalance > 0.005 ? "success" : "warning"}>
                      اعتبار کیف‌پول این تأمین‌کننده ({activeCurrency}):{" "}
                      <b>{money(walletBalance)}</b> — باقی‌مانده برای استفاده در همین تسویه:{" "}
                      <b>{money(walletRemaining)}</b> {activeCurrency}
                    </Note>
                  </div>
                )}
                {checkedInvoices.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--geist-secondary)]">
                    از فهرست بالا، فاکتورهایی را که همین حالا از اعتبار کیف‌پول تسویه می‌شوند اضافه کنید.
                  </div>
                ) : (
                  <div className="scroll-x">
                    <table>
                      <thead>
                        <tr>
                          <th>فاکتور</th>
                          <th>سررسید</th>
                          <th>مانده</th>
                          <th>از اعتبار</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkedInvoices.map((i) => {
                          const credit = creditAmounts[i.id] ?? 0;
                          const creditMax = Math.min(i.balance, credit + walletRemaining);
                          return (
                            <tr key={i.id}>
                              <td>
                                {i.invoice_no} <Badge tone={statusTone(i.payment_status)}>{i.payment_status}</Badge>
                              </td>
                              <td>{i.due_date ? <DateText value={i.due_date} /> : "—"}</td>
                              <td className="num">
                                {balanceLabel(i.balance)} {i.currency}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  dir="ltr"
                                  value={credit === 0 ? "" : String(credit)}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d.]/g, "");
                                    const v = raw === "" ? 0 : Math.min(parseFloat(raw) || 0, creditMax);
                                    setCredit(i.id, v);
                                  }}
                                  className={`num w-28 ${controlBase} ${controlBorder(false)} h-10 px-3 text-left`}
                                />
                                {credit > 0 && (
                                  <>
                                    <input type="hidden" name="invoice_id" value={i.id} />
                                    <input type="hidden" name="amount" value={credit} />
                                  </>
                                )}
                              </td>
                              <td>
                                <Button size="tiny" variant="tertiary" onClick={() => uncheck(i.id)}>
                                  حذف
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {mixedCurrency && (
                  <div className="p-4 pt-0">
                    <Note type="error">
                      فاکتورهای انتخاب‌شده ارزهای متفاوتی دارند؛ فقط فاکتورهای هم‌ارز را با هم تسویه کنید
                    </Note>
                  </div>
                )}
              </Card>

              {/* دیوی معمولی به‌جای Card: Card به‌خاطر overflow-hidden، تقویم بازشوی DateInput را می‌بُرد */}
              <div className="grid gap-4 rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-4 sm:grid-cols-2">
                <DateInput name="payment_date" label="تاریخ" />
                <Input name="reference" label="مرجع/رسید" />
                <div className="sm:col-span-2">
                  <Input name="notes" label="توضیحات" />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Submit disabled={creditUsedTotal <= 0.005 || mixedCurrency}>
                    {creditUsedTotal > 0.005
                      ? `تسویه از اعتبار (${checkedInvoices.length} فاکتور — ${money(creditUsedTotal)})`
                      : "تسویه از اعتبار"}
                  </Submit>
                  <Link href="/payments">
                    <Button>انصراف</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </div>
  );
}
