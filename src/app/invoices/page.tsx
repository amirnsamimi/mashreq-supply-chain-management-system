import { requirePermission } from "@/lib/auth";
import { INVOICE_SORTS, listInvoicesPaged, listSuppliers } from "@/lib/queries";
import { parseParams } from "@/lib/paging";
import { Page } from "@/components/Nav";
import { InvoicesClient } from "./InvoicesClient";
import { NewInvoiceTrigger } from "./NewInvoiceTrigger";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("invoices");
  const params = parseParams(await searchParams, INVOICE_SORTS, "invoice_no");
  const invoices = await listInvoicesPaged(params);
  const suppliers = await listSuppliers();

  return (
    <Page
      active="/invoices"
      title="فاکتورها"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={<NewInvoiceTrigger suppliers={suppliers} />}
    >
      <InvoicesClient page={invoices} suppliers={suppliers} />
    </Page>
  );
}
