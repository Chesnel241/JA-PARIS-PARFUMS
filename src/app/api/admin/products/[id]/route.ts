import { ApiError, handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteAdminProduct, getAdminProduct, productConflictMessage, setAdminProductStatus, updateAdminProduct } from "@/lib/product-service";
import { productInputSchema, productStatusSchema } from "@/lib/product-validation";
import { revalidateCatalog } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = {
  notFound: "Produit introuvable.",
  conflict: productConflictMessage,
  referenced: "Ce produit appartient à une commande. Dépubliez-le au lieu de le supprimer.",
};

async function existingSlug(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) throw new ApiError(404, messages.notFound);
  return product.slug;
}

export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/products:get", async () => {
    await requireApiStaff();
    const product = await getAdminProduct(await parseId(params, messages.notFound));
    if (!product) throw new ApiError(404, messages.notFound);
    return json({ product });
  }, messages);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handleApi("admin/products:update", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const input = await parseJson(request, productInputSchema);
    const previousSlug = await existingSlug(id);
    const product = await updateAdminProduct(id, input);
    // Invalide la nouvelle ET l'ancienne URL en cas de changement de slug.
    revalidateCatalog({ slugs: [previousSlug, product.slug], productId: id });
    return json({ product });
  }, messages);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/products:status", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { isActive } = await parseJson(request, productStatusSchema, { message: "Statut invalide." });
    const product = await setAdminProductStatus(id, isActive);
    revalidateCatalog({ slugs: [product.slug], productId: id });
    return json({ product });
  }, messages);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/products:delete", async () => {
    await requireApiStaff({ adminOnly: true });
    const id = await parseId(params, messages.notFound);
    const slug = await existingSlug(id);
    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) throw new ApiError(409, messages.referenced, { code: "PRODUCT_HAS_ORDERS" });
    await deleteAdminProduct(id);
    revalidateCatalog({ slugs: [slug], productId: id });
    return noContent();
  }, messages);
}
