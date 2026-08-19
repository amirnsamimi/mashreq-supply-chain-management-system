"use client";

import Link from "next/link";
import { Badge, DataTable } from "@/components/geist";
import type { Column } from "@/components/geist/DataTable";
import { statusTone } from "@/lib/tones";
import { jalali } from "@/lib/format";

type Row = {
  id: number;
  user_name: string;
  action: string;
  entity: string;
  entity_label: string;
  entity_id: number | null;
  summary: string;
  created_at: string;
};

const hrefFor = (entity: string, id: number | null) => {
  if (!id) return null;
  if (entity === "invoice") return `/invoices/${id}`;
  if (entity === "shipment") return `/shipments/${id}`;
  return null;
};

function time(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function HistoryTable({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "created_at",
      header: "زمان",
      value: (r) => r.created_at,
      render: (r) => (
        <span className="whitespace-nowrap">
          {jalali(r.created_at)} <span className="text-[var(--geist-tertiary)]">{time(r.created_at)}</span>
        </span>
      ),
    },
    { key: "user_name", header: "کاربر", value: (r) => r.user_name },
    {
      key: "action",
      header: "عملیات",
      value: (r) => r.action,
      render: (r) => <Badge tone={statusTone(r.action)}>{r.action}</Badge>,
    },
    { key: "entity_label", header: "نوع", value: (r) => r.entity_label },
    {
      key: "summary",
      header: "شرح",
      value: (r) => r.summary,
      render: (r) => {
        const href = hrefFor(r.entity, r.entity_id);
        return href ? (
          <Link href={href} className="hover:underline">
            {r.summary}
          </Link>
        ) : (
          <span className="whitespace-normal">{r.summary}</span>
        );
      },
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="جست‌وجو در تاریخچه…"
      emptyTitle="هنوز تغییری ثبت نشده است"
      emptyHint="هر ایجاد، ویرایش و حذفی از این پس اینجا ثبت می‌شود"
      showTotals={false}
      pageSize={50}
      toolbar={
        <a href="/api/export/history" download>
          <span className="inline-flex h-8 items-center rounded-[var(--geist-radius)] border border-[var(--geist-border)] px-2.5 text-sm transition hover:border-[var(--geist-foreground)]">
            خروجی اکسل
          </span>
        </a>
      }
    />
  );
}
