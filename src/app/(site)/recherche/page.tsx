import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/catalog";
import { ProductSearch } from "@/components/product-search";

export const metadata: Metadata = {
  title: "Recherche",
  description: "Recherchez un parfum ou un accessoire JAE Paris par nom, note olfactive ou famille.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialQuery = (raw ?? "").slice(0, 80);
  const products = await getPublicProducts();

  return (
    <div className="page-shell cm-search-page">
      <header className="cm-search-head">
        <p className="eyebrow">Recherche</p>
        <h1>Trouver son <em>sillage.</em></h1>
      </header>
      <ProductSearch products={products} initialQuery={initialQuery} />
    </div>
  );
}
