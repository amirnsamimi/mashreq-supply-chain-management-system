"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PaymentRow, TransferRow } from "@/lib/queries";
import { money } from "@/lib/format";
import { updatePaymentAllocation, updateTransfer, type FormResult } from "@/lib/actions";
import { NEGATIVE_WALLET_MARK, PAY_METHODS } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Button, DateInput, Input, Modal, Note, NumberInput, SelectField } from "@/components/geist";

/** بعد از ذخیره موفق، مودال بسته می‌شود؛ صفحه با revalidatePath خودش تازه می‌شود */
function CloseOnSuccess({ state, onSuccess }: { state: FormResult; onSuccess: () => void }) {
  const last = useRef<FormResult>(null);
  useEffect(() => {
    if (state?.ok && state !== last.current) {
      last.current = state;
      // با هشدار کیف‌پول منفی، مودال باز می‌ماند تا پیام دیده شود
      if (!state.ok.includes(NEGATIVE_WALLET_MARK)) onSuccess();
    }
  }, [state, onSuccess]);
  return null;
}

/** روش پرداخت فعلی ممکن است در فهرست نباشد؛ همان را نگه می‌داریم */
function methodOptions(current: string | null) {
  return current && !PAY_METHODS.includes(current) ? [current, ...PAY_METHODS] : PAY_METHODS;
}

/** مودال داخل سلول جدول رندر نمی‌شود تا white-space و استایل‌های جدول به آن نرسد */
function InBody({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="tiny" variant="tertiary" onClick={onClick}>
      ویرایش
    </Button>
  );
}

export function EditTransferButton({ row }: { row: TransferRow }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const minAmount = Math.max(0, row.amount - row.wallet_balance);

  return (
    <>
      <EditButton onClick={() => setOpen(true)} />
      <InBody>
      <Modal
        open={open}
        onClose={close}
        title="ویرایش انتقال"
        description={`${row.supplier} — ${money(row.amount)} ${row.currency ?? ""}`}
        footer={null}
      >
        <ActionForm action={updateTransfer} className="grid gap-4">
          {(state) => (
            <>
              <CloseOnSuccess state={state} onSuccess={close} />
              <input type="hidden" name="id" value={row.id} />
              <NumberInput name="amount" label={`مبلغ (${row.currency ?? ""})`} defaultValue={row.amount} />
              {minAmount > 0.005 && (
                <p className="-mt-2 text-xs text-[var(--geist-tertiary)]">
                  اعتبار مصرف‌نشده کیف‌پول {money(row.wallet_balance)} است؛ اگر مبلغ را کمتر از {money(minAmount)} کنید،
                  کیف‌پول منفی می‌شود (یعنی بیش از پول واقعی تسویه شده).
                </p>
              )}
              <DateInput name="payment_date" label="تاریخ" defaultValue={row.payment_date} />
              <SelectField
                name="method"
                label="روش پرداخت"
                defaultValue={row.method ?? ""}
                options={methodOptions(row.method)}
                allowEmpty
              />
              <Input name="reference" label="مرجع/رسید" defaultValue={row.reference ?? ""} />
              <Input name="notes" label="توضیحات" defaultValue={row.notes ?? ""} />
              <div className="flex justify-end gap-2">
                <Button size="small" onClick={close}>انصراف</Button>
                <Submit size="small">ذخیره</Submit>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
      </InBody>
    </>
  );
}

export function EditAllocationButton({ row }: { row: PaymentRow }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const isCredit = row.kind === "allocation";
  // پرداخت قدیمی ساده (پول = سهم همین فاکتور): دو عدد پیش‌فرض با هم عوض می‌شوند
  const simpleLegacy = !isCredit && row.invoice_count === 1 && Math.abs(row.payment_amount - row.amount) < 0.005;
  const [linked, setLinked] = useState(simpleLegacy);
  const [share, setShare] = useState(String(row.amount));
  const [cash, setCash] = useState(String(row.payment_amount));

  function reset() {
    setLinked(simpleLegacy);
    setShare(String(row.amount));
    setCash(String(row.payment_amount));
    setOpen(true);
  }

  return (
    <>
      <EditButton onClick={reset} />
      <InBody>
      <Modal
        open={open}
        onClose={close}
        title={`ویرایش پرداخت فاکتور ${row.invoice_no}`}
        description={`${row.supplier ?? ""} — ${money(row.amount)} ${row.currency ?? ""}${isCredit ? " — تسویه از اعتبار کیف‌پول" : ""}`}
        footer={null}
      >
        <ActionForm action={updatePaymentAllocation} className="grid gap-4">
          {(state) => (
            <>
              <CloseOnSuccess state={state} onSuccess={close} />
              <input type="hidden" name="allocation_id" value={row.id} />
              <MoneyField
                name="amount"
                label={`سهم این فاکتور (${row.currency ?? ""})`}
                value={share}
                onChange={(v) => {
                  setShare(v);
                  if (linked) setCash(v);
                }}
              />
              {isCredit ? (
                <p className="-mt-2 text-xs text-[var(--geist-tertiary)]">
                  افزایش از اعتبار کیف‌پول برداشته می‌شود و کاهش به کیف‌پول برمی‌گردد؛ بیشتر از مانده فاکتور ثبت نمی‌شود.
                </p>
              ) : (
                <>
                  <MoneyField
                    name="payment_amount"
                    label={`پول واقعی کل این پرداخت (${row.currency ?? ""})`}
                    value={cash}
                    disabled={linked}
                    onChange={setCash}
                  />
                  <label className="-mt-2 flex items-center gap-2 text-xs text-[var(--geist-secondary)]">
                    <input type="checkbox" checked={linked} onChange={(e) => {
                      setLinked(e.target.checked);
                      if (e.target.checked) setCash(share);
                    }} />
                    پول واقعی همان سهم این فاکتور است
                  </label>
                  {linked && <input type="hidden" name="payment_amount" value={cash} />}
                  <p className="-mt-2 text-xs text-[var(--geist-tertiary)]">
                    پرداخت قدیمی: «پول واقعی» یعنی چقدر واقعاً واریز شد (با صورت‌حساب بانک تطبیق دهید)، «سهم فاکتور» یعنی چقدرش
                    پای این فاکتور حساب شد. تفاوت‌ها و اضافه‌پرداخت فاکتور خودکار در کیف‌پول تأمین‌کننده تطبیق داده می‌شود.
                  </p>
                </>
              )}
              {row.invoice_count > 1 && (
                <Note>
                  این پرداخت بین {row.invoice_count} فاکتور تقسیم شده؛ پول واقعی، تاریخ، روش، مرجع و توضیحات مال کل پرداخت‌اند.
                </Note>
              )}
              <DateInput name="payment_date" label="تاریخ پرداخت" defaultValue={row.payment_date} />
              {isCredit ? (
                <input type="hidden" name="method" value={row.method ?? ""} />
              ) : (
                <SelectField
                  name="method"
                  label="روش پرداخت"
                  defaultValue={row.method ?? ""}
                  options={methodOptions(row.method)}
                  allowEmpty
                />
              )}
              <Input name="reference" label="مرجع/رسید" defaultValue={row.reference ?? ""} />
              <Input name="notes" label="توضیحات" defaultValue={row.notes ?? ""} />
              <div className="flex justify-end gap-2">
                <Button size="small" onClick={close}>انصراف</Button>
                <Submit size="small">ذخیره</Submit>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
      </InBody>
    </>
  );
}

/** ورودی عدد کنترل‌شده (NumberInput موجود کنترل‌نشده است) */
function MoneyField({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      name={disabled ? undefined : name}
      label={label}
      inputMode="decimal"
      dir="ltr"
      className="num"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))}
    />
  );
}
