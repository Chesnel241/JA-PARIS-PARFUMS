import { ProductCard } from "@/components/product-card";
import { getPublicProducts } from "@/lib/catalog";

export const metadata = { title: "La collection" };

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getPublicProducts();
  return <div className="page-shell shop-page"><header className="page-intro"><p className="eyebrow">La collection JAE</p><h1>Choisir son<br /><em>empreinte.</em></h1><p>Trois créations, trois manières d’habiter le monde. Prenez le temps de rencontrer celle qui vous ressemble.</p></header><div className="shop-toolbar"><span>{products.length} parfums</span><span>Extraits & eaux de parfum</span></div><div className="product-grid">{products.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div></div>;
}
