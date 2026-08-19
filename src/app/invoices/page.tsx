import { requireAuth } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { InvoicesClient } from "./InvoicesClient";
import { NewInvoiceTrigger } from "./NewInvoiceTrigger";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const me = await requireAuth();
  const invoices = await listInvoices();

  return (
    <Page
      active="/invoices"
      title="فاکتورها"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewInvoiceTrigger />}
    >
      <InvoicesClient invoices={invoices} />
    </Page>
  );
}
