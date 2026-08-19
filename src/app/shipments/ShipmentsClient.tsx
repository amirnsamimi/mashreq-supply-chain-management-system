"use client";

import Link from "next/link";
import { useState } from "react";
import type { Shipment } from "@/lib/queries";
import { money, qty as fq } from "@/lib/format";
import { createShipment } from "@/lib/actions";
import { MODES } from "@/lib/lists";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Button, Card, DataTable, DateInput, Input, Modal, NumberInput, SelectField } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { statusTone } from "@/lib/tones";
import { DateText } from "@/components/DateText";

export function ShipmentsClient({ shipments }: { shipments: Shipment[] }) {
  const [open, setOpen] = useState(false);

  const columns: Column<Shipment>[] = [
    {
      key: "shipment_no",
      header: "شماره پارت",
      value: (r) => r.shipment_no,
      render: (r) => (
        <Link href={`/shipments/${r.id}`} className="font-medium hover:underline">
          {r.shipment_no}
        </Link>
      ),
      total: (rows) => `جمع ${rows.length} پارت`,
    },
    { key: "invoice_nos", header: "فاکتورها", value: (r) => r.invoice_nos },
    { key: "carrier", header: "کارگو", value: (r) => r.carrier },
    { key: "mode", header: "نوع حمل", value: (r) => r.mode },
    { key: "tracking_no", header: "رهگیری", value: (r) => r.tracking_no, className: "num" },
    { key: "handover_date", header: "تحویل به کارگو", value: (r) => r.handover_date, render: (r) => <DateText value={r.handover_date} /> },
    { key: "receive_date", header: "دریافت", value: (r) => r.receive_date, render: (r) => <DateText value={r.receive_date} /> },
    { key: "transit_days", header: "مدت (روز)", value: (r) => r.transit_days, className: "num" },
    {
      key: "total_qty",
      header: "تعداد کالا",
      value: (r) => r.total_qty,
      render: (r) => <span className="num">{fq(r.total_qty)}</span>,
      total: (rows) => <span className="num">{fq(rows.reduce((s, r) => s + r.total_qty, 0))}</span>,
    },
    {
      key: "received_qty",
      header: "دریافت‌شده",
      value: (r) => r.received_qty,
      render: (r) => <span className="num">{fq(r.received_qty)}</span>,
      total: (rows) => <span className="num">{fq(rows.reduce((s, r) => s + r.received_qty, 0))}</span>,
    },
    {
      key: "freight_cost",
      header: "هزینه حمل",
      value: (r) => r.freight_cost,
      render: (r) => <span className="num">{money(r.freight_cost)}</span>,
      total: (rows) => <span className="num">{money(rows.reduce((s, r) => s + r.freight_cost, 0))}</span>,
    },
    {
      key: "freight_per_unit",
      header: "حمل هر واحد",
      value: (r) => r.freight_per_unit,
      render: (r) => <span className="num">{money(r.freight_per_unit)}</span>,
    },
    {
      key: "status",
      header: "وضعیت",
      value: (r) => r.status,
      render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
    },
  ];

  return (
    <Card>
      <DataTable
        rows={shipments}
        columns={columns}
        searchPlaceholder="جست‌وجو در پارت‌ها…"
        emptyTitle="هنوز پارتی ثبت نشده است"
        emptyHint="با دکمه «پارت جدید» شروع کنید"
        emptyAction={
          <Button variant="primary" size="small" onClick={() => setOpen(true)}>
            پارت جدید
          </Button>
        }
        toolbar={
          <a href="/api/export/shipments" download>
            <Button size="small">خروجی اکسل</Button>
          </a>
        }
      />
      <NewShipmentModal open={open} setOpen={setOpen} />
    </Card>
  );
}

export function NewShipmentModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="پارت ارسال جدید" footer={null} width={720}>
      <ActionForm action={createShipment} className="grid gap-4 sm:grid-cols-3">
        <Input name="shipment_no" label="شماره پارت" required placeholder="SHP-001" dir="ltr" />
        <Input name="carrier" label="نام کارگو" />
        <SelectField name="mode" label="نوع حمل" options={MODES} allowEmpty />
        <DateInput name="handover_date" label="تحویل به کارگو" />
        <DateInput name="depart_date" label="تاریخ خروج" />
        <DateInput name="receive_date" label="تاریخ دریافت" />
        <Input name="tracking_no" label="شماره رهگیری" dir="ltr" />
        <NumberInput name="freight_cost" label="هزینه حمل پارت" defaultValue={0} />
        <NumberInput name="weight_kg" label="وزن (کیلو)" />
        <NumberInput name="cbm" label="حجم CBM" />
        <div className="sm:col-span-2">
          <Input name="notes" label="توضیحات" />
        </div>
        <div className="flex gap-2 sm:col-span-3">
          <Submit>ثبت پارت</Submit>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}
