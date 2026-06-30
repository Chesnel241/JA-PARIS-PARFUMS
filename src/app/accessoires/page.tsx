import { ProductCategory } from "@prisma/client";
import { ProductCard } from "@/components/product-card";
import { getPublicProducts } from "@/lib/catalog";

export const metadata = { title: "Accessoires" };

export const dynamic = "force-dynamic";

export default async function AccessoriesPage() {
  const products = await getPublicProducts(ProductCategory.ACCESSOIRE);
  return <div className="page-shell shop-page"><header className="page-intro"><p className="eyebrow">Les accessoires JAE</p><h1>Pièces<br /><em>signature.</em></h1><p>Bijoux et accessoires façonnés à la main, pensés comme le prolongement de nos parfums.</p></header><div className="shop-toolbar"><span>{products.length} pièce{products.length > 1 ? "s" : ""}</span><span>Laiton doré à l’or fin</span></div>{products.length === 0 ? <div className="empty-cart"><p>Nos premières pièces arrivent très bientôt.</p></div> : <div className="product-grid">{products.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div>}</div>;
}
