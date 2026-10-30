import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/catalog";
import { ProductSearch } from "@/components/product-search";
import { PageHead } from "@/components/site/page-head";

export const metadata: Metadata = {
  title: "Recherche",
  description: "Recherchez une eau de parfum ou un bijou JAE Paris par nom, note olfactive, famille ou heure.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialQuery = (raw ?? "").slice(0, 80);
  const products = await getPublicProducts();

  return (
    <>
      <PageHead tag="Recherche" compact title={<>Trouver son <span className="serif">sillage</span></>} lead="Un parfum, une note, une heure ou un bijou : tout ce que la maison compose." />
      <ProductSearch products={products} initialQuery={initialQuery} />
    </>
  );
}
