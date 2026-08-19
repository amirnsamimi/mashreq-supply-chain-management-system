import { requireAuth } from "@/lib/auth";
import { listShipments } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { ShipmentsClient } from "./ShipmentsClient";
import { NewShipmentTrigger } from "./NewShipmentTrigger";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const me = await requireAuth();
  const shipments = await listShipments();

  return (
    <Page
      active="/shipments"
      title="پارت‌های ارسال"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewShipmentTrigger />}
    >
      <ShipmentsClient shipments={shipments} />
    </Page>
  );
}
