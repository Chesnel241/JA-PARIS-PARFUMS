import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { listFr } from "@/lib/heures";
import { buyVariant, hourLabel, shownVariant } from "@/lib/maison";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { Scene, photosOf } from "@/components/maison/scene";
import { QuickAdd } from "@/components/site/quick-add";

export const PRODUCT_CARD_SIZES = "(min-width: 1100px) 25vw, (min-width: 760px) 50vw, 100vw";

/** Ligne descriptive d'une carte : trois notes pour un parfum, l'accroche pour un bijou. */
export function cardMeta(product: Product) {
  if (product.category === "ACCESSOIRE") return product.tagline || "Bijou en laiton doré";
  const notes = [...product.notes.top.slice(0, 2), ...product.notes.base.slice(0, 1)];
  return notes.length ? capitalizeFirst(listFr(notes)) : product.family || "Eau de parfum";
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}

/**
 * Carte produit : visuel arrondi (photo, ou flacon illustré), pastilles
 * d'heure et de disponibilité, nom en italique, prix et ajout rapide.
 * Composant serveur ; seul le bouton « + » est un îlot client.
 */
export function ProductCard({ product, sizes = PRODUCT_CARD_SIZES, headingLevel = "h3", priority = false }: {
  product: Product;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
}) {
  const Heading = headingLevel;
  const href = `/produit/${product.slug}`;
  const shown = shownVariant(product);
  const buy = buyVariant(product);
  const hover = photosOf(product)[1];
  const isAccessory = product.category === "ACCESSOIRE";
  const label = isAccessory ? "Les Ors" : hourLabel(product);

  return (
    <article className="pcard">
      <Link className="pcard-vis" href={href} tabIndex={-1} aria-hidden="true">
        <Scene subject={product} sizes={sizes} priority={priority} />
        {hover ? (
          <span className="alt">
            <Image src={hover} alt="" fill sizes={sizes} unoptimized={isUnoptimizedImage(hover)} className="ph-fill" />
          </span>
        ) : null}
        <span className="pcard-tags">
          {label ? <span className="chip tab">{label}</span> : <span />}
          {buy ? <span className="chip ok">Disponible</span> : <span className="chip wait">Bientôt de retour</span>}
        </span>
      </Link>
      <div className="pcard-row">
        <div>
          <Heading className="pcard-name"><Link href={href}>{product.name}</Link></Heading>
          <p className="meta">{cardMeta(product)}</p>
        </div>
        {shown ? (
          <div className="pcard-act">
            <span className="price">
              {!buy ? <span className="sr-only">Bientôt de retour, </span> : null}
              {formatPrice(shown.price)}
              {!isAccessory || product.variants.length > 1 ? <small>{shown.volume}</small> : null}
            </span>
            {buy ? (
              <QuickAdd item={{ slug: product.slug, name: product.name, image: product.image, volume: buy.volume, price: buy.price, stock: buy.stock }} />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
