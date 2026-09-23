import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { ProductsTable, type ProductRow } from "@/components/admin/products-table";
import { requireAdminStaff } from "@/components/admin/staff";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/components/admin/labels";
import { listAdminProducts } from "@/lib/product-service";

export const metadata = { title: "Produits" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [user, products] = await Promise.all([requireAdminStaff(), listAdminProducts()]);
  const rows: ProductRow[] = products.map((product) => {
    const sellable = product.variants.filter((variant) => variant.isActive);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      image: product.images[0] ?? null,
      isActive: product.isActive,
      minPrice: product.variants.length ? Math.min(...product.variants.map((variant) => variant.price)) : null,
      stock: sellable.reduce((sum, variant) => sum + variant.stock, 0),
      variantCount: product.variants.length,
      lowVariants: sellable.filter((variant) => variant.stock <= LOW_STOCK_THRESHOLD).length,
      skus: product.variants.map((variant) => variant.sku),
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Ventes"
        title="Produits"
        description="Parfums et accessoires : prix, stock, images et publication."
        actions={<Link className="adm-btn adm-btn--primary" href="/admin/produits/nouveau"><Plus aria-hidden /> Nouveau produit</Link>}
      />
      {rows.length === 0 ? (
        <div className="adm-card">
          <EmptyState icon={Package} title="Votre catalogue est vide" description="Ajoutez votre premier parfum ou accessoire : il restera en brouillon tant que vous ne le publiez pas." action={<Link className="adm-btn adm-btn--primary" href="/admin/produits/nouveau"><Plus aria-hidden /> Ajouter un produit</Link>} />
        </div>
      ) : (
        <ProductsTable products={rows} canDelete={user.role === Role.ADMIN} />
      )}
    </>
  );
}
