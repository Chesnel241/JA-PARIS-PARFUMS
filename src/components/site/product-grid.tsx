import type { Product } from "@/lib/data";
import { ProductCard } from "@/components/product-card";

/** Grille de cartes (3 colonnes, ou 4 avec `dense`) à apparition échelonnée. */
export function ProductGrid({ products, dense = false, headingLevel = "h3", label, priorityCount = 0 }: {
  products: Product[];
  dense?: boolean;
  headingLevel?: "h2" | "h3";
  label?: string;
  priorityCount?: number;
}) {
  const sizes = dense ? "(min-width: 1100px) 25vw, (min-width: 760px) 50vw, 100vw" : "(min-width: 760px) 33vw, 100vw";
  return (
    <ul className={`cards${dense ? " c4" : ""}`} aria-label={label} data-stagger="" style={{ "--stagger": "0.08s" } as React.CSSProperties}>
      {products.map((product, index) => (
        <li key={product.slug} data-animate="">
          <ProductCard product={product} sizes={sizes} headingLevel={headingLevel} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
