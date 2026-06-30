import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { HomeContent } from "./home-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, accessories] = await Promise.all([
    getPublicProducts(ProductCategory.PARFUM),
    getPublicProducts(ProductCategory.ACCESSOIRE),
  ]);
  return <HomeContent products={products} accessories={accessories} />;
}
