import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import { getPublicProduct, getPublicProducts } from "@/lib/catalog";
import { PAYMENT_COPY } from "@/lib/payment";
import type { Product } from "@/lib/data";
import { paletteOf } from "@/lib/heures";
import { hourLabel, sortByDay } from "@/lib/maison";
import { safeImageSrc } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { Accent } from "@/components/maison/maison-context";
import { Notes3 } from "@/components/maison/notes";
import { Evaporation } from "@/components/product/evaporation";
import { ProductGallery } from "@/components/product/gallery";
import { PurchaseBox } from "@/components/product/purchase-box";
import { ProductGrid } from "@/components/site/product-grid";
import { JsonLd } from "@/components/site/json-ld";
import { getSiteUrl } from "@/components/site/seo";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// Une seule requête par rendu, partagée entre generateMetadata et la page.
const loadProduct = cache((slug: string) => getPublicProduct(slug));

function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${getSiteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

function shortDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Création introuvable", robots: { index: false, follow: true } };

  const description = shortDescription([product.tagline, product.description].filter(Boolean).join(" ") || product.story);
  const url = absoluteUrl(`/produit/${product.slug}`);
  const images = product.images.map(safeImageSrc).slice(0, 4).map((image) => ({ url: absoluteUrl(image), alt: product.name }));
  const title = product.hour ? `${product.name}, ${product.hour}` : product.name;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "fr_FR", siteName: "JAE Paris", title: `${title} — JAE Paris`, description, url, images },
    twitter: { card: "summary_large_image", title: `${title} — JAE Paris`, description, images: images.map((image) => image.url) },
  };
}

function productJsonLd(product: Product) {
  const url = absoluteUrl(`/produit/${product.slug}`);
  const isAccessory = product.category === ProductCategory.ACCESSOIRE;
  const categoryLabel = isAccessory ? "Les Ors" : "Parfums";
  const categoryPath = isAccessory ? "/accessoires" : "/boutique";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: product.description,
        image: product.images.map((image) => absoluteUrl(safeImageSrc(image))),
        url,
        sku: product.slug,
        category: categoryLabel,
        brand: { "@type": "Brand", name: "JAE Paris" },
        offers: product.variants.map((variant) => ({
          "@type": "Offer",
          name: `${product.name} · ${variant.volume}`,
          sku: `${product.slug}-${variant.volume}`.toLowerCase().replace(/\s+/g, "-"),
          price: (variant.price / 100).toFixed(2),
          priceCurrency: "EUR",
          availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          url,
          seller: { "@type": "Organization", name: "JAE Paris" },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: categoryLabel, item: absoluteUrl(categoryPath) },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };
}

/** Le récit, avec le nom du parfum en italique à sa première occurrence. */
function StoryQuote({ story, name }: { story: string; name: string }) {
  const index = story.indexOf(name);
  if (index === -1) return <>{story}</>;
  return <>{story.slice(0, index)}<span className="serif">{name}</span>{story.slice(index + name.length)}</>;
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const isAccessory = product.category === ProductCategory.ACCESSOIRE;
  const all = await getPublicProducts();
  const otherPerfumes = sortByDay(all.filter((entry) => entry.category === ProductCategory.PARFUM && entry.slug !== product.slug));
  const otherPieces = all.filter((entry) => entry.category === ProductCategory.ACCESSOIRE && entry.slug !== product.slug);
  const others = (isAccessory ? [...otherPieces, ...otherPerfumes] : [...otherPerfumes, ...otherPieces]).slice(0, 3);
  const hasAllNotes = !isAccessory && product.notes.top.length > 0 && product.notes.heart.length > 0 && product.notes.base.length > 0;
  const label = hourLabel(product);
  const categoryLabel = isAccessory ? "Les Ors" : "Parfums";
  const categoryHref = isAccessory ? "/accessoires" : "/boutique";

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <Accent color={isAccessory ? null : paletteOf(product.palette).accent} />

      <div className="wrap produit">
        <ProductGallery subject={product} badge={label || undefined} />

        <div className="p-info">
          <nav aria-label="Fil d’Ariane">
            <ol className="crumbs">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href={categoryHref}>{categoryLabel}</Link></li>
              <li aria-current="page">{product.name}</li>
            </ol>
          </nav>
          <span className="tag">{isAccessory ? "Les Ors · Laiton doré" : "Eau de parfum"}</span>
          <h1 className="p-name">{product.name}</h1>
          {product.tagline ? <p className="p-tag">{product.tagline}</p> : null}
          <p className="p-desc">{product.description}</p>
          {!isAccessory ? <Notes3 notes={product.notes} /> : null}
          <PurchaseBox product={product} />
          <ul className="perks">
            <li>Livraison offerte dès 50&nbsp;€, sinon 5,90&nbsp;€</li>
            <li>Expédition sous 2 à 3 jours</li>
            <li>{isAccessory ? "Retours sous 14 jours pour tout article intact" : "Retours sous 14 jours si le flacon est intact et non ouvert"}</li>
            <li>{PAYMENT_COPY.short}</li>
            {product.family ? <li>{product.family}</li> : null}
          </ul>
          {isAccessory ? (
            <details className="care">
              <summary>Conseil d’entretien</summary>
              <p>Vaporisez votre parfum, laissez-le sécher, puis mettez vos bijoux. Le laiton doré garde mieux son éclat loin de l’eau, du parfum et des crèmes.</p>
            </details>
          ) : null}
        </div>
      </div>

      {product.story ? (
        <section className="wrap p-story trait" aria-label="Le récit">
          <span className="tag tab">{product.hour ? `L’histoire de ${product.hour}` : "Le récit"}</span>
          <blockquote><StoryQuote story={product.story} name={product.name} /></blockquote>
        </section>
      ) : null}

      {hasAllNotes ? (
        <section className="wrap evap trait" aria-labelledby="evap-title">
          <div className="sec-head">
            <div><span className="tag">Votre sillage dans le temps</span><h2 className="h-lg" id="evap-title">Ce qui reste de vous, <span className="serif">heure après heure.</span></h2></div>
            <p className="lead">Un parfum évolue sur la peau. Faites glisser le temps pour voir les notes se révéler, puis s’effacer. Les durées sont indicatives et varient selon chaque peau.</p>
          </div>
          <Evaporation product={product} />
        </section>
      ) : null}

      {!isAccessory ? (
        <section className="wrap porter trait" aria-labelledby="porter-title">
          <span className="tag" id="porter-title">Comment le porter</span>
          <ul className="porter-grid">
            <li><strong>Sur les points chauds</strong><span>Cou, arrière des oreilles, intérieur des poignets. La chaleur diffuse le parfum autour de vous.</span></li>
            <li><strong>Sans frotter</strong><span>Frotter écrase les notes de tête. Vaporisez, puis laissez sécher.</span></li>
            <li><strong>À l’heure qui vous ressemble</strong><span>{product.moment ? `${product.name} est pensé pour ${product.moment.toLocaleLowerCase("fr-FR")}, mais votre heure vous appartient.` : "Chaque parfum a son heure, mais la vôtre vous appartient."}</span></li>
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="wrap autres trait" aria-labelledby="autres-title">
          <div className="sec-head">
            <h2 className="h-lg" id="autres-title">{isAccessory ? <>À porter <span className="serif">avec</span></> : <>Les autres <span className="serif">heures</span></>}</h2>
            <Link className="lien" href="/boutique">Toute la collection <ArrowIcon /></Link>
          </div>
          <ProductGrid products={others} />
        </section>
      ) : null}
    </>
  );
}
