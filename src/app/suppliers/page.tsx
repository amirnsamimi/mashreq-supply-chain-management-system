import { requirePermission } from "@/lib/auth";
import { SUPPLIER_SORTS, listSuppliersPaged } from "@/lib/queries";
import { parseParams } from "@/lib/paging";
import { Page } from "@/components/Nav";
import { NewSupplierTrigger, SuppliersClient } from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("suppliers");
  const params = parseParams(await searchParams, SUPPLIER_SORTS, "name");
  const suppliers = await listSuppliersPaged(params);

  return (
    <Page
      active="/suppliers"
      title="تأمین‌کنندگان"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={<NewSupplierTrigger />}
    >
      <SuppliersClient page={suppliers} />
    </Page>
  );
}
