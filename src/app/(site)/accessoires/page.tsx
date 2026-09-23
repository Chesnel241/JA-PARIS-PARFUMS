import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { CatalogPage } from "@/components/site/catalog-page";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Accessoires",
    description: "Les bijoux JAE Paris en laiton doré : boucles d’oreilles, bagues et pièces signature.",
    path: "/accessoires",
  });
}

export default async function AccessoriesPage() {
  const products = await getPublicProducts(ProductCategory.ACCESSOIRE);
  return (
    <CatalogPage
      current="/accessoires"
      eyebrow="Accessoires"
      title="Bijoux en laiton doré"
      lede="Des pièces sculpturales, dans le prolongement de nos parfums."
      products={products}
      unit={["pièce", "pièces"]}
      empty={{ title: "Nos premières pièces arrivent bientôt.", text: "Revenez très vite découvrir les bijoux de la maison." }}
    />
  );
}
