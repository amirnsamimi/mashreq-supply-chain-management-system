"use client";

import Link from "next/link";
import { useState } from "react";
import type { Supplier } from "@/lib/queries";
import type { Paged } from "@/lib/paging";
import { money } from "@/lib/format";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, DataTable, Input, Modal, Textarea } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { useOpenParam } from "@/components/useOpenParam";

export function SuppliersClient({ page }: { page: Paged<Supplier> }) {
  const suppliers = page.rows;
  const [edit, setEdit] = useState<Supplier | null>(null);

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "نام تأمین‌کننده",
      value: (r) => r.name,
      render: (r) => <span className="font-medium">{r.name}</span>,
      total: (rows) => `جمع این صفحه (${rows.length} تأمین‌کننده)`,
    },
    { key: "contact", header: "شخص رابط", value: (r) => r.contact },
    {
      key: "phone",
      header: "تلفن",
      value: (r) => r.phone,
      render: (r) => (r.phone ? <span className="num" dir="ltr">{r.phone}</span> : "—"),
    },
    { key: "country", header: "کشور", value: (r) => r.country },
    { key: "city", header: "شهر", value: (r) => r.city },
    {
      key: "invoice_count",
      header: "تعداد فاکتور",
      value: (r) => r.invoice_count,
      render: (r) =>
        r.invoice_count > 0 ? (
          <Link href="/invoices" className="num hover:underline">
            {r.invoice_count}
          </Link>
        ) : (
          <span className="num text-[var(--geist-tertiary)]">0</span>
        ),
      total: (rows) => <span className="num">{rows.reduce((s, r) => s + r.invoice_count, 0)}</span>,
    },
    {
      key: "total_amount",
      header: "جمع خرید",
      value: (r) => r.total_amount,
      render: (r) => <span className="num">{money(r.total_amount)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.total_amount, 0))}</span>,
    },
    {
      key: "balance",
      header: "مانده بدهی",
      value: (r) => r.balance,
      render: (r) => (
        <span className={`num ${r.balance > 0 ? "font-medium text-[var(--geist-red-text)]" : ""}`}>
          {money(r.balance)}
        </span>
      ),
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.balance, 0))}</span>,
    },
    {
      key: "is_active",
      header: "وضعیت",
      value: (r) => (r.is_active ? "فعال" : "غیرفعال"),
      render: (r) => (
        <Badge tone={r.is_active ? "green" : "gray"}>{r.is_active ? "فعال" : "غیرفعال"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (r) => (
        <Button size="tiny" variant="tertiary" onClick={() => setEdit(r)}>
          ویرایش
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <DataTable
        rows={suppliers}
        columns={columns}
        server={page}
        searchPlaceholder="جست‌وجو در نام، رابط، تلفن یا شهر…"
        emptyTitle="هنوز تأمین‌کننده‌ای تعریف نشده است"
        emptyHint="اول تأمین‌کننده‌ها را بسازید تا در فاکتورها از فهرست انتخابشان کنید"
        toolbar={
          <a href="/api/export/suppliers" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
      <EditSupplierModal supplier={edit} onClose={() => setEdit(null)} />
    </Card>
  );
}

function SupplierFields({ sup }: { sup?: Supplier }) {
  return (
    <>
      <div className="sm:col-span-2">
        <Input name="name" label="نام تأمین‌کننده" defaultValue={sup?.name ?? ""} required />
      </div>
      <Input name="contact" label="شخص رابط" defaultValue={sup?.contact ?? ""} />
      <Input name="phone" label="تلفن" dir="ltr" defaultValue={sup?.phone ?? ""} />
      <Input name="email" label="ایمیل" type="email" dir="ltr" defaultValue={sup?.email ?? ""} />
      <Input name="country" label="کشور" defaultValue={sup?.country ?? ""} />
      <Input name="city" label="شهر" defaultValue={sup?.city ?? ""} />
      <Input name="address" label="آدرس" defaultValue={sup?.address ?? ""} />
      <div className="sm:col-span-2">
        <Textarea name="notes" label="توضیحات" rows={2} defaultValue={sup?.notes ?? ""} />
      </div>
    </>
  );
}

export function NewSupplierModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="تأمین‌کننده جدید"
      description="یک بار تعریف کنید تا در همه فاکتورها از فهرست انتخابش کنید."
      footer={null}
      width={640}
    >
      <ActionForm action={createSupplier} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
        <SupplierFields />
        <div className="flex gap-2 sm:col-span-2">
          <Submit>ثبت تأمین‌کننده</Submit>
          <Button onClick={() => setOpen(false)}>بستن</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}

function EditSupplierModal({
  supplier,
  onClose,
}: {
  supplier: Supplier | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!supplier}
      onClose={onClose}
      title={supplier ? `ویرایش ${supplier.name}` : ""}
      description={
        supplier && supplier.invoice_count > 0
          ? `${supplier.invoice_count} فاکتور به این تأمین‌کننده وصل است؛ تغییر نام، آن فاکتورها را هم به‌روز می‌کند.`
          : undefined
      }
      footer={null}
      width={640}
    >
      {supplier && (
        <>
          <ActionForm action={updateSupplier} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={supplier.id} />
            <input type="hidden" name="is_active" value={supplier.is_active ? "on" : "off"} />
            <SupplierFields sup={supplier} />
            <div className="flex gap-2 sm:col-span-2">
              <Submit>ذخیره</Submit>
              <Button onClick={onClose}>انصراف</Button>
            </div>
          </ActionForm>
          <form action={deleteSupplier} className="mt-4 border-t border-[var(--geist-border)] pt-4">
            <input type="hidden" name="id" value={supplier.id} />
            <Button
              htmlType="submit"
              size="small"
              variant="tertiary"
              className="!text-[var(--geist-red-text)]"
              confirm={
                supplier.invoice_count > 0
                  ? "این تأمین‌کننده فاکتور دارد، پس حذف نمی‌شود و فقط غیرفعال می‌شود. ادامه؟"
                  : "این تأمین‌کننده حذف شود؟"
              }
            >
              {supplier.invoice_count > 0 ? "غیرفعال کردن" : "حذف تأمین‌کننده"}
            </Button>
          </form>
        </>
      )}
    </Modal>
  );
}

export function NewSupplierTrigger() {
  const [open, setOpen] = useOpenParam("supplier");
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + تأمین‌کننده جدید
      </Button>
      <NewSupplierModal open={open} setOpen={setOpen} />
    </>
  );
}
