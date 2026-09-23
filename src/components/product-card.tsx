import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { imageFit, isApiMedia } from "@/components/site/media";

export const PRODUCT_CARD_SIZES = "(min-width: 1200px) 25vw, (min-width: 900px) 33vw, 50vw";

/**
 * Carte produit « image d'abord ». Composant serveur (aucun JS client) :
 * survol et fondu de la seconde image sont gérés en CSS.
 */
export function ProductCard({ product, sizes = PRODUCT_CARD_SIZES, headingLevel = "h3", priority = false }: {
  product: Product;
  /** Conservé pour compatibilité : l'échelonnement est géré par la grille. */
  index?: number;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
}) {
  const prices = product.variants.map((variant) => variant.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const hasRange = new Set(prices).size > 1;
  const soldOut = product.variants.reduce((sum, variant) => sum + variant.stock, 0) <= 0;
  const primary = product.images[0] ?? product.image;
  const secondary = product.images[1];
  const Heading = headingLevel;
  const volumes = product.category === "PARFUM" ? product.variants.map((variant) => variant.volume).join(" · ") : null;

  return (
    <article className="product-card" data-sold-out={soldOut ? "" : undefined}>
      <Link href={`/produit/${product.slug}`} className="product-card-link">
        <div className="product-card-media" data-has-alt={secondary ? "" : undefined}>
          <Image
            src={primary}
            alt={product.name}
            fill
            sizes={sizes}
            priority={priority}
            unoptimized={isApiMedia(primary)}
            className={`product-card-img fit-${imageFit(primary)}`}
          />
          {secondary ? (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              unoptimized={isApiMedia(secondary)}
              className={`product-card-img is-alt fit-${imageFit(secondary)}`}
            />
          ) : null}
          {soldOut ? <span className="product-card-badge">Épuisé</span> : null}
        </div>
        <div className="product-card-body">
          <Heading className="product-card-title">{product.name}</Heading>
          {volumes ? <p className="product-card-meta">{volumes}</p> : null}
          <p className="product-card-price">
            {soldOut ? <span className="sr-only">Épuisé — </span> : null}
            {hasRange ? "À partir de " : ""}{formatPrice(minPrice)}
          </p>
        </div>
      </Link>
    </article>
  );
}
