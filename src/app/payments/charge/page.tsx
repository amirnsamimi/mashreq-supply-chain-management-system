import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listSuppliers, listWalletCharges } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { Button } from "@/components/geist";
import { ChargeWalletForm } from "./ChargeWalletForm";

export const dynamic = "force-dynamic";

export default async function ChargeWalletPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("payments");
  const sp = await searchParams;
  const supplierParam = typeof sp.supplier === "string" ? sp.supplier : "";
  const supplierId = supplierParam ? Number(supplierParam) : null;

  const suppliers = await listSuppliers();
  const charges = supplierId ? await listWalletCharges(supplierId) : [];

  return (
    <Page
      active="/payments"
      title="شارژ کیف‌پول"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={
        <Link href="/payments">
          <Button size="small">بازگشت به پرداخت‌ها</Button>
        </Link>
      }
    >
      <ChargeWalletForm suppliers={suppliers} initialSupplierId={supplierParam} charges={charges} />
    </Page>
  );
}
