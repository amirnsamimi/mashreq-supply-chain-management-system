"use client";

import { useState } from "react";
import type { Product } from "@/lib/queries";
import { money, qty as fq } from "@/lib/format";
import { createProduct, deleteProduct, updateProduct } from "@/lib/actions";
import { UNITS } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, DataTable, Input, Modal, NumberInput, SelectField, Textarea } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";

export function ProductsClient({ products }: { products: Product[] }) {
  const [edit, setEdit] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "کد کالا / SKU",
      value: (r) => r.sku,
      render: (r) => <span className="num font-medium">{r.sku}</span>,
      total: (rows) => `${rows.length} کالا`,
    },
    { key: "name", header: "نام کالا", value: (r) => r.name },
    { key: "category", header: "دسته", value: (r) => r.category },
    { key: "unit", header: "واحد", value: (r) => r.unit },
    {
      key: "last_price",
      header: "آخرین قیمت",
      value: (r) => r.last_price,
      render: (r) => <span className="num">{r.last_price === null ? "—" : money(r.last_price)}</span>,
    },
    {
      key: "invoice_count",
      header: "در چند فاکتور",
      value: (r) => r.invoice_count,
      render: (r) => <span className="num">{fq(r.invoice_count)}</span>,
    },
    {
      key: "total_qty",
      header: "جمع تعداد خریداری‌شده",
      value: (r) => r.total_qty,
      render: (r) => <span className="num">{fq(r.total_qty)}</span>,
      total: (rows) => <span className="num">{fq(rows.reduce((s, r) => s + r.total_qty, 0))}</span>,
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
        rows={products}
        columns={columns}
        searchPlaceholder="جست‌وجو در کد، نام یا دسته کالا…"
        emptyTitle="هنوز کالایی تعریف نشده است"
        emptyHint="اول کالاها را تعریف کنید تا بتوانید در فاکتورها از فهرست انتخابشان کنید"
        toolbar={
          <a href="/api/export/products" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
      <EditProductModal product={edit} onClose={() => setEdit(null)} />
    </Card>
  );
}

function ProductFields({ p }: { p?: Product }) {
  return (
    <>
      <Input name="sku" label="کد کالا / SKU" defaultValue={p?.sku ?? ""} required dir="ltr" />
      <Input name="name" label="نام کالا" defaultValue={p?.name ?? ""} required />
      <Input name="category" label="دسته" defaultValue={p?.category ?? ""} />
      <SelectField name="unit" label="واحد" defaultValue={p?.unit ?? ""} options={UNITS} allowEmpty />
      <NumberInput name="last_price" label="آخرین قیمت واحد" defaultValue={p?.last_price ?? null} />
      <div className="sm:col-span-2">
        <Textarea name="notes" label="توضیحات" rows={2} defaultValue={p?.notes ?? ""} />
      </div>
    </>
  );
}

export function NewProductModal({
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
      title="کالای جدید"
      description="کالا را یک بار تعریف کنید تا در همه فاکتورها از فهرست انتخابش کنید."
      footer={null}
      width={600}
    >
      <ActionForm action={createProduct} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
        <ProductFields />
        <div className="flex gap-2 sm:col-span-2">
          <Submit>ثبت کالا</Submit>
          <Button onClick={() => setOpen(false)}>بستن</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}

function EditProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={product ? `ویرایش ${product.sku}` : ""}
      description={
        product && product.invoice_count > 0
          ? `این کالا در ${product.invoice_count} فاکتور استفاده شده؛ تغییر کد یا نام، اقلام آن فاکتورها را هم به‌روز می‌کند.`
          : undefined
      }
      footer={null}
      width={600}
    >
      {product && (
        <>
          <ActionForm action={updateProduct} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="is_active" value={product.is_active ? "on" : "off"} />
            <ProductFields p={product} />
            <div className="flex gap-2 sm:col-span-2">
              <Submit>ذخیره</Submit>
              <Button onClick={onClose}>انصراف</Button>
            </div>
          </ActionForm>
          <form action={deleteProduct} className="mt-4 border-t border-[var(--geist-border)] pt-4">
            <input type="hidden" name="id" value={product.id} />
            <Button
              htmlType="submit"
              size="small"
              variant="tertiary"
              className="!text-[var(--geist-red-text)]"
              confirm={
                product.invoice_count > 0
                  ? "این کالا در فاکتورها استفاده شده، پس حذف نمی‌شود و فقط غیرفعال می‌شود. ادامه؟"
                  : "این کالا حذف شود؟"
              }
            >
              {product.invoice_count > 0 ? "غیرفعال کردن کالا" : "حذف کالا"}
            </Button>
          </form>
        </>
      )}
    </Modal>
  );
}

export function NewProductTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + کالای جدید
      </Button>
      <NewProductModal open={open} setOpen={setOpen} />
    </>
  );
}
