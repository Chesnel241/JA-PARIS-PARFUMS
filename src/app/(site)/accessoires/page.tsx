import Image from "next/image";
import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { hourLabel, isAvailable, sortByDay } from "@/lib/maison";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { Scene } from "@/components/maison/scene";
import { PurchaseBox } from "@/components/product/purchase-box";
import { PageHead } from "@/components/site/page-head";
import { ProductGrid } from "@/components/site/product-grid";
import { getCachedSiteImages, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Les Ors, bijoux dorés",
    description: "Les Ors de JAE Paris : des boucles d’oreilles en laiton doré aux formes sculptées, pensées comme la dernière note d’un sillage.",
    path: "/accessoires",
  });
}

const LOOKBOOK = ["ors.lookbook.1", "ors.lookbook.2", "ors.lookbook.3", "ors.lookbook.4", "ors.lookbook.5"] as const;

export default async function LesOrsPage() {
  const [products, images] = await Promise.all([getPublicProducts(), getCachedSiteImages()]);
  const pieces = products.filter((product) => product.category === ProductCategory.ACCESSOIRE);
  const perfumes = sortByDay(products.filter((product) => product.category === ProductCategory.PARFUM && product.hour));
  const [featured, ...rest] = pieces;

  return (
    <>
      <PageHead
        tag="Accessoires"
        title={<>Les <span className="serif">Ors</span></>}
        lead="Des boucles d’oreilles dorées aux formes sculptées, pensées comme la dernière note d’un sillage. Elles se portent seules, ou avec votre heure."
      />

      <section className="wrap lookbook" aria-label="La campagne Les Ors">
        {LOOKBOOK.map((key, index) => (
          <figure key={key} className={`lk${index === 1 || index === 4 ? "" : " tall"}`}>
            <Image className="ph-fill" src={images[key]} alt={`Les Ors : boucles d’oreilles dorées portées, photo ${index + 1} sur ${LOOKBOOK.length}`} fill priority={index < 4} sizes="(min-width: 980px) 25vw, 50vw" unoptimized={isUnoptimizedImage(images[key])} style={{ objectPosition: "50% 30%" }} />
          </figure>
        ))}
      </section>

      {featured ? (
        <section className="wrap ors-produit" aria-labelledby="piece-title">
          <Link className="ors-vis" href={`/produit/${featured.slug}`} tabIndex={-1} aria-hidden="true">
            <Scene subject={featured} sizes="(min-width: 980px) 52vw, 100vw" width="50%" />
          </Link>
          <div className="ors-info">
            {isAvailable(featured) ? <span className="stat ok">Disponible</span> : <span className="stat wait">Bientôt de retour</span>}
            <h2 className="p-name" id="piece-title"><Link href={`/produit/${featured.slug}`}>{featured.name}</Link></h2>
            {featured.tagline ? <p className="p-tag">{featured.tagline}</p> : null}
            <p className="muted">{featured.description}</p>
            <PurchaseBox product={featured} />
            <ul className="perks">
              <li>Matière&nbsp;: laiton doré</li>
              <li>Livraison offerte dès 50&nbsp;€, sinon 5,90&nbsp;€</li>
              <li>Retours sous 14 jours pour tout article intact</li>
            </ul>
            <details className="care">
              <summary>Conseil d’entretien</summary>
              <p>Vaporisez votre parfum, laissez-le sécher, puis mettez vos bijoux. Le laiton doré garde mieux son éclat loin de l’eau, du parfum et des crèmes.</p>
            </details>
          </div>
        </section>
      ) : (
        <section className="wrap" style={{ paddingBottom: "clamp(40px, 6vw, 80px)" }}>
          <div className="vide">
            <p>Les premières pièces arrivent bientôt.</p>
            <p>Les Ors seront très prochainement disponibles. En attendant, découvrez les parfums de la maison.</p>
            <Link className="btn" href="/boutique">Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
          </div>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="wrap" style={{ paddingBottom: "clamp(60px, 8vw, 110px)" }} aria-labelledby="pieces-title">
          <div className="sec-head"><h2 className="h-lg" id="pieces-title">Toutes les <span className="serif">pièces</span></h2></div>
          <ProductGrid products={rest} />
        </section>
      ) : null}

      {featured && perfumes.length > 0 ? (
        <section className="wrap accords trait" aria-labelledby="accords-title">
          <h2 className="h-lg" id="accords-title">{featured.name} et <span className="serif">votre heure</span></h2>
          <ul className="accords-grid">
            {perfumes.slice(0, 3).map((perfume) => (
              <li key={perfume.slug}>
                <Link className="accord" href={`/produit/${perfume.slug}`}>
                  <div className="av"><Scene subject={perfume} sizes="(min-width: 760px) 33vw, 100vw" /></div>
                  <div className="at">
                    <span className="small muted tab">{hourLabel(perfume)}</span>
                    <strong>{featured.name} + {perfume.name}</strong>
                    <span>{perfume.tagline || perfume.family || "L’or qui répond à votre heure."}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
