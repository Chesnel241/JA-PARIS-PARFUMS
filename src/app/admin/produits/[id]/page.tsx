import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { ProductAdminForm } from "@/components/product-admin-form";
import { requireAdminStaff } from "@/components/admin/staff";
import { getAdminProduct } from "@/lib/product-service";

export const metadata = { title: "Modifier le produit" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, product] = await Promise.all([requireAdminStaff(), getAdminProduct(id)]);
  if (!product) notFound();
  return (
    <ProductAdminForm
      key={product.id}
      canDelete={user.role === Role.ADMIN}
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        description: product.description,
        story: product.story,
        images: product.images,
        notesTop: product.notesTop,
        notesHeart: product.notesHeart,
        notesBase: product.notesBase,
        isActive: product.isActive,
        variants: product.variants.map((variant) => ({ sku: variant.sku, volume: variant.volume, price: variant.price, stock: variant.stock, isActive: variant.isActive })),
      }}
    />
  );
}
