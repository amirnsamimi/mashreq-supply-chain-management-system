import { requireAuth } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { Page } from "@/components/Nav";
import { NewProductTrigger, ProductsClient } from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const me = await requireAuth();
  const products = await listProducts();

  return (
    <Page
      active="/products"
      title="کالاها"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewProductTrigger />}
    >
      <ProductsClient products={products} />
    </Page>
  );
}
