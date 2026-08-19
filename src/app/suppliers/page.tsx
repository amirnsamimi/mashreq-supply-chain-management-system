import { requireAuth } from "@/lib/auth";
import { listSuppliers } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { NewSupplierTrigger, SuppliersClient } from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const me = await requireAuth();
  const suppliers = await listSuppliers();

  return (
    <Page
      active="/suppliers"
      title="تأمین‌کنندگان"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewSupplierTrigger />}
    >
      <SuppliersClient suppliers={suppliers} />
    </Page>
  );
}
