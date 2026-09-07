"use client";

import { useRouter } from "next/navigation";
import type { Supplier } from "@/lib/queries";
import { money } from "@/lib/format";
import { chargeWallet } from "@/lib/actions";
import { CURRENCIES, PAY_METHODS } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Card, Combobox, DateInput, Input, NumberInput, SelectField } from "@/components/geist";
import { DateText } from "@/components/DateText";

type Charge = {
  id: number;
  currency: string;
  amount: number;
  payment_date: string | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
};

/** شارژ مستقیم کیف‌پول یک تأمین‌کننده — بدون این‌که به فاکتوری وصل باشد (مثلاً پیش‌پرداخت) */
export function ChargeWalletForm({
  suppliers,
  initialSupplierId = "",
  charges,
}: {
  suppliers: Supplier[];
  initialSupplierId?: string;
  charges: Charge[];
}) {
  const router = useRouter();

  const supplierOptions = [...suppliers]
    .sort((a, b) => a.name.localeCompare(b.name, "fa"))
    .map((sup) => {
      const wallet = sup.wallet_balances.map((w) => `${money(w.balance)} ${w.currency}`).join("، ");
      return {
        value: String(sup.id),
        label: sup.name,
        hint: wallet ? `اعتبار فعلی: ${wallet}` : undefined,
      };
    });

  function selectSupplier(v: string) {
    router.push(v ? `/payments/charge?supplier=${v}` : "/payments/charge");
  }

  const selectedSupplier = suppliers.find((sup) => String(sup.id) === initialSupplierId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ActionForm action={chargeWallet} className="grid gap-4">
        {/* دیوی معمولی به‌جای Card: Card به‌خاطر overflow-hidden، تقویم بازشوی DateInput را می‌بُرد */}
        <div className="grid gap-4 rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-4">
          <Combobox
            label="تأمین‌کننده"
            placeholder="جست‌وجو و انتخاب تأمین‌کننده…"
            emptyText="تأمین‌کننده‌ای پیدا نشد"
            options={supplierOptions}
            value={initialSupplierId}
            onChange={selectSupplier}
          />
          <input type="hidden" name="supplier_id" value={initialSupplierId} />
          {selectedSupplier && selectedSupplier.wallet_balances.length > 0 && (
            <p className="text-sm text-[var(--geist-secondary)]">
              اعتبار فعلی این تأمین‌کننده:{" "}
              {selectedSupplier.wallet_balances.map((w) => `${money(w.balance)} ${w.currency}`).join("، ")}
            </p>
          )}
          <SelectField name="currency" label="ارز" defaultValue={CURRENCIES[0]} options={CURRENCIES} />
          <NumberInput name="amount" label="مبلغ شارژ" defaultValue={0} />
          <DateInput name="payment_date" label="تاریخ" />
          <SelectField name="method" label="روش پرداخت" defaultValue={PAY_METHODS[0]} options={PAY_METHODS} />
          <Input name="reference" label="مرجع/رسید" />
          <Input name="notes" label="توضیحات" />
          <Submit disabled={!initialSupplierId}>شارژ کیف‌پول</Submit>
        </div>
      </ActionForm>

      <Card title="شارژهای اخیر این تأمین‌کننده">
        {!initialSupplierId ? (
          <div className="p-4 text-sm text-[var(--geist-secondary)]">اول یک تأمین‌کننده انتخاب کنید.</div>
        ) : charges.length === 0 ? (
          <div className="p-4 text-sm text-[var(--geist-secondary)]">
            هنوز شارژ مستقیمی برای این تأمین‌کننده ثبت نشده.
          </div>
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
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.payment_date ? <DateText value={c.payment_date} /> : "—"}</td>
                    <td className="num font-medium">
                      {money(c.amount)} {c.currency}
                    </td>
                    <td>{c.method ?? "—"}</td>
                    <td>{c.reference ?? "—"}</td>
                    <td className="text-[var(--geist-secondary)]">{c.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
