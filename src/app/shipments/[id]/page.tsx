import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getShipment, listAllocationsForShipment, listOpenItems } from "@/lib/queries";
import { money, qty as fq } from "@/lib/format";
import { Page } from "@/components/Nav";
import { Badge, Stat } from "@/components/geist";
import { statusTone } from "@/lib/tones";
import { AllocationsCard, ShipmentEditCard } from "./ShipmentDetail";

export const dynamic = "force-dynamic";

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("shipments");
  const id = Number((await params).id);
  const sh = await getShipment(id);
  if (!sh) notFound();

  const allocs = await listAllocationsForShipment(id);
  const openItems = await listOpenItems();

  return (
    <Page
      active="/shipments"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      title={
        <span className="flex items-center gap-3">
          پارت {sh.shipment_no}
          <Badge tone={statusTone(sh.status)}>{sh.status}</Badge>
        </span>
      }
      action={
        <Link
          href="/shipments"
          className="text-sm text-[var(--geist-secondary)] hover:underline"
        >
          ← بازگشت به فهرست
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="هزینه حمل پارت" value={money(sh.freight_cost)} />
        <Stat label="تعداد کل کالا" value={fq(sh.total_qty)} hint={`${allocs.length} قلم`} />
        <Stat label="دریافت‌شده" value={fq(sh.received_qty)} tone="good" />
        <Stat label="هزینه حمل هر واحد" value={money(sh.freight_per_unit)} />
        <Stat label="مدت حمل (روز)" value={sh.transit_days ?? "—"} />
      </div>

      <div className="mt-6">
        <AllocationsCard shipment={sh} allocs={allocs} openItems={openItems} />
      </div>

      <div className="mt-6">
        <ShipmentEditCard shipment={sh} />
      </div>
    </Page>
  );
}
