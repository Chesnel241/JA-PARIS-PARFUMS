import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { CatalogPage } from "@/components/site/catalog-page";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Parfums",
    description: "Les parfums JAE Paris, composés à Paris. Eaux et extraits de parfum, livraison offerte dès 50 €.",
    path: "/boutique",
  });
}

export default async function ShopPage() {
  const products = await getPublicProducts(ProductCategory.PARFUM);
  return (
    <CatalogPage
      current="/boutique"
      eyebrow="La collection"
      title="Les parfums"
      lede="Composés à Paris, pensés comme une signature."
      products={products}
      unit={["parfum", "parfums"]}
      empty={{ title: "La collection arrive bientôt.", text: "Nos parfums seront très prochainement disponibles." }}
    />
  );
}
