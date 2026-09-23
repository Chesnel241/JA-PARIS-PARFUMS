import { handleApi, json, parseJson, requireApiStaff } from "@/lib/api";
import { createAdminProduct, listAdminProducts, productConflictMessage } from "@/lib/product-service";
import { productInputSchema } from "@/lib/product-validation";
import { revalidateCatalog } from "@/lib/revalidate";

export async function GET() {
  return handleApi("admin/products:list", async () => {
    await requireApiStaff();
    return json({ products: await listAdminProducts() });
  });
}

export async function POST(request: Request) {
  return handleApi("admin/products:create", async () => {
    await requireApiStaff();
    const input = await parseJson(request, productInputSchema);
    const product = await createAdminProduct(input);
    revalidateCatalog({ slugs: [product.slug], productId: product.id });
    return json({ product }, { status: 201 });
  }, { conflict: productConflictMessage });
}
