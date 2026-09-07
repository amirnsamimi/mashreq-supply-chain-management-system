import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listInvoices, listSuppliers } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { Button } from "@/components/geist";
import { NewPaymentForm } from "./NewPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("payments");
  const sp = await searchParams;
  const supplierParam = sp.supplier;
  const initialSupplierId = typeof supplierParam === "string" ? supplierParam : "";

  const invoices = await listInvoices();
  const suppliers = await listSuppliers();

  return (
    <Page
      active="/payments"
      title="ثبت پرداخت"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={
        <Link href="/payments">
          <Button size="small">بازگشت به پرداخت‌ها</Button>
        </Link>
      }
    >
      <NewPaymentForm invoices={invoices} suppliers={suppliers} initialSupplierId={initialSupplierId} />
    </Page>
  );
}
