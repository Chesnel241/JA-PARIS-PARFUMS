import type { Product } from "@/lib/data";
import { ProductCard, PRODUCT_CARD_SIZES } from "@/components/product-card";
import { Stagger, StaggerItem } from "@/components/motion";

/** Grille produits responsive (2 colonnes mobile, 3 à 4 desktop) à apparition échelonnée. */
export function ProductGrid({ products, className = "", headingLevel = "h3", label, priorityCount = 0 }: {
  products: Product[];
  className?: string;
  headingLevel?: "h2" | "h3";
  label?: string;
  priorityCount?: number;
}) {
  const dense = products.length >= 4;
  const sizes = dense ? PRODUCT_CARD_SIZES : "(min-width: 900px) 33vw, 50vw";
  return (
    <Stagger as="ul" label={label} className={`product-grid${dense ? " is-dense" : ""} ${className}`.trim()}>
      {products.map((product, index) => (
        <StaggerItem as="li" key={product.slug}>
          <ProductCard product={product} sizes={sizes} headingLevel={headingLevel} priority={index < priorityCount} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
