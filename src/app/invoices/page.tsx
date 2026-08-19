import { requireAuth } from "@/lib/auth";
import { listInvoices, listSuppliers } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { InvoicesClient } from "./InvoicesClient";
import { NewInvoiceTrigger } from "./NewInvoiceTrigger";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const me = await requireAuth();
  const invoices = await listInvoices();
  const suppliers = await listSuppliers();

  return (
    <Page
      active="/invoices"
      title="فاکتورها"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewInvoiceTrigger suppliers={suppliers} />}
    >
      <InvoicesClient invoices={invoices} suppliers={suppliers} />
    </Page>
  );
}
