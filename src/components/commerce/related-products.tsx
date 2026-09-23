import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";

export function lowestPrice(product: Product) {
  return product.variants.reduce((min, variant) => Math.min(min, variant.price), Number.POSITIVE_INFINITY);
}

// Carte produit « image d'abord » du parcours d'achat (suggestions, recherche).
export function CommerceProductCard({ product, sizes = "(max-width: 760px) 50vw, 25vw" }: { product: Product; sizes?: string }) {
  const src = safeImageSrc(product.image);
  const inStock = product.variants.some((variant) => variant.stock > 0);
  const price = lowestPrice(product);
  const multiple = product.variants.length > 1;

  return (
    <Link href={`/produit/${encodeURIComponent(product.slug)}`} className="cm-card">
      <span className="cm-card__media">
        <Image src={src} alt="" fill sizes={sizes} unoptimized={isUnoptimizedImage(src)} className={isVectorImage(src) ? "is-contained" : "is-cover"} />
        {!inStock ? <span className="cm-card__badge">Épuisé</span> : null}
      </span>
      <span className="cm-card__body">
        <span className="cm-card__name">{product.name}</span>
        <span className="cm-card__meta">
          {product.category === "ACCESSOIRE" ? "Accessoire" : "Parfum"}
          <span aria-hidden="true"> · </span>
          {Number.isFinite(price) ? `${multiple ? "dès " : ""}${formatPrice(price)}` : ""}
        </span>
      </span>
    </Link>
  );
}

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="cm-related" aria-labelledby="cm-related-title">
      <div className="cm-related__head">
        <p className="eyebrow">La maison JAE</p>
        <h2 id="cm-related-title">Vous aimerez aussi</h2>
      </div>
      <ul className="cm-related__grid">
        {products.map((product) => (
          <li key={product.slug}>
            <CommerceProductCard product={product} sizes="(max-width: 760px) 70vw, 30vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
