import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/catalog";
import type { CatalogSnapshot } from "@/lib/cart";
import { CartCheckout } from "./cart-checkout";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: false },
};

// Prix et stock toujours frais : le panier est réconcilié avec la base à
// chaque affichage (le serveur recalcule de toute façon à la commande).
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const products = await getPublicProducts();
  const catalog: CatalogSnapshot[] = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    image: product.image,
    variants: product.variants.map(({ volume, price, stock }) => ({ volume, price, stock })),
  }));

  return (
    <Suspense fallback={<div className="page-shell cm-cart-page" aria-busy="true" />}>
      <CartCheckout catalog={catalog} />
    </Suspense>
  );
}
