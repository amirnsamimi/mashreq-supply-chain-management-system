import { requirePermission } from "@/lib/auth";
import { SHIPMENT_SORTS, listShipmentsPaged } from "@/lib/queries";
import { parseParams } from "@/lib/paging";
import { Page } from "@/components/Nav";
import { ShipmentsClient } from "./ShipmentsClient";
import { NewShipmentTrigger } from "./NewShipmentTrigger";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("shipments");
  const params = parseParams(await searchParams, SHIPMENT_SORTS, "shipment_no");
  const shipments = await listShipmentsPaged(params);

  return (
    <Page
      active="/shipments"
      title="پارت‌های ارسال"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={<NewShipmentTrigger />}
    >
      <ShipmentsClient page={shipments} />
    </Page>
  );
}
