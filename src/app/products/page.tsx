import { requirePermission } from "@/lib/auth";
import { PRODUCT_SORTS, listProductsPaged } from "@/lib/queries";
import { parseParams } from "@/lib/paging";
import { Page } from "@/components/Nav";
import { NewProductTrigger, ProductsClient } from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("products");
  const params = parseParams(await searchParams, PRODUCT_SORTS, "sku");
  const products = await listProductsPaged(params);

  return (
    <Page
      active="/products"
      title="کالاها"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={<NewProductTrigger />}
    >
      <ProductsClient page={products} />
    </Page>
  );
}
