import { ProductAdminForm } from "@/components/product-admin-form";
import { requireAdminStaff } from "@/components/admin/staff";
import { getAdminProduct } from "@/lib/product-service";

export const metadata = { title: "Nouveau produit" };
export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ dupliquer?: string }> }) {
  const [, { dupliquer }] = await Promise.all([requireAdminStaff(), searchParams]);
  const source = dupliquer ? await getAdminProduct(dupliquer) : null;
  // Duplication : même contenu, nouveau slug et SKU vides (uniques en base), en brouillon.
  const draft = source ? {
    name: `${source.name} (copie)`,
    slug: `${source.slug}-copie`,
    category: source.category,
    description: source.description,
    story: source.story,
    images: source.images,
    notesTop: source.notesTop,
    notesHeart: source.notesHeart,
    notesBase: source.notesBase,
    isActive: false,
    variants: source.variants.map((variant) => ({ sku: "", volume: variant.volume, price: variant.price, stock: 0, isActive: variant.isActive })),
  } : undefined;
  return <ProductAdminForm key={source?.id ?? "new"} product={draft} duplicatedFrom={source?.name} />;
}
