import { getPublicProducts } from "@/lib/catalog";
import { HomeContent } from "./home-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublicProducts();
  return <HomeContent products={products} />;
}
