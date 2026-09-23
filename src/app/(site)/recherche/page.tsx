import { getPublicProducts } from "@/lib/catalog";
import { ProductSearch } from "@/components/product-search";

export const metadata = { title: "Recherche" };

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const products = await getPublicProducts();
  return (
    <div className="page-shell">
      <header className="page-intro compact">
        <p className="eyebrow">Recherche</p>
        <h1>Trouver son<br /><em>sillage.</em></h1>
      </header>
      <ProductSearch products={products} />
    </div>
  );
}
