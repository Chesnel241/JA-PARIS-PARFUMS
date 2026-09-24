import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { PURCHASE_END_ID } from "@/components/commerce/constants";
import { ProductGallery } from "@/components/commerce/product-gallery";
import { RelatedProducts } from "@/components/commerce/related-products";
import { safeImageSrc } from "@/components/commerce/media";
import { getPublicProduct, getPublicProducts } from "@/lib/catalog";
import { RevealText } from "@/components/experience/reveal-text";
import { SillageCanvas } from "@/components/experience/sillage-canvas";
import type { Product } from "@/lib/data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// Une seule requête par rendu, partagée entre generateMetadata et la page.
const loadProduct = cache((slug: string) => getPublicProduct(slug));

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://jaeparis.com").replace(/\/+$/, "");

function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function shortDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Création introuvable", robots: { index: false, follow: true } };

  const description = shortDescription(product.description || product.story);
  const url = `/produit/${product.slug}`;
  const images = product.images.map(safeImageSrc).slice(0, 4).map((image) => ({ url: absoluteUrl(image), alt: product.name }));

  return {
    title: product.name,
    description,
    alternates: { canonical: absoluteUrl(url) },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "JAE Paris",
      title: `${product.name} — JAE Paris`,
      description,
      url: absoluteUrl(url),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — JAE Paris`,
      description,
      images: images.map((image) => image.url),
    },
  };
}

function productJsonLd(product: Product) {
  const url = absoluteUrl(`/produit/${product.slug}`);
  const categoryLabel = product.category === ProductCategory.ACCESSOIRE ? "Accessoires" : "Parfums";
  const categoryPath = product.category === ProductCategory.ACCESSOIRE ? "/accessoires" : "/boutique";
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

const NOTE_LEVELS = [
  { key: "top", label: "Notes de tête" },
  { key: "heart", label: "Notes de cœur" },
  { key: "base", label: "Notes de fond" },
] as const;

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const isAccessory = product.category === ProductCategory.ACCESSOIRE;
  const hasNotes = !isAccessory && NOTE_LEVELS.some(({ key }) => product.notes[key].length > 0);
  const sameCategory = (await getPublicProducts(product.category)).filter((entry) => entry.slug !== product.slug);
  const related = sameCategory.length > 0
    ? sameCategory.slice(0, 3)
    : (await getPublicProducts()).filter((entry) => entry.slug !== product.slug).slice(0, 3);
  const categoryLabel = isAccessory ? "Accessoires" : "Parfums";
  const categoryHref = isAccessory ? "/accessoires" : "/boutique";
  // « </script> » neutralisé dans le JSON-LD.
  const jsonLd = JSON.stringify(productJsonLd(product)).replace(/</g, "\\u003c");

  return (
    <div className="cm-pdp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <nav className="cm-breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li><Link href="/">Accueil</Link></li>
          <li><Link href={categoryHref}>{categoryLabel}</Link></li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="cm-pdp__main">
        <div className="cm-pdp__media">
          <ProductGallery
            images={product.images}
            name={product.name}
            backdrop={isAccessory ? undefined : <SillageCanvas tone="day" intensity={0.9} />}
          />
        </div>

        <div className="cm-pdp__info">
          <div className="cm-pdp__sticky">
            <p className="cm-pdp__kicker">{isAccessory ? "Accessoire" : "Parfum"} · JAE Paris</p>
            <RevealText as="h1" mode="load" className="cm-pdp__title" delay={0.1}>{product.name}</RevealText>
            {product.subtitle ? <p className="cm-pdp__subtitle">{product.subtitle}</p> : null}
            <AddToCart product={product} />
            {product.description ? <p className="cm-pdp__description">{product.description}</p> : null}
            <ul className="cm-assurances" aria-label="Nos engagements">
              <li><Truck aria-hidden="true" /><span><strong>Livraison offerte dès 50 €</strong> Sinon 5,90 €</span></li>
              <li><ShieldCheck aria-hidden="true" /><span><strong>Paiement sécurisé Lydia</strong> Après validation de la commande</span></li>
              <li><RotateCcw aria-hidden="true" /><span><strong>Retours sous 14 jours</strong> Article intact, non ouvert</span></li>
            </ul>
          </div>
        </div>
      </div>

      {product.story || hasNotes ? (
        <section className={`cm-story${hasNotes ? "" : " is-single"}`} aria-labelledby="cm-story-title">
          <div className="cm-story__text">
            <p className="eyebrow">Le récit</p>
            <h2 id="cm-story-title" data-animate="fade-up">{isAccessory ? <>Une pièce <em>à part.</em></> : <>L’histoire <em>d’un sillage.</em></>}</h2>
            {product.story ? <p>{product.story}</p> : null}
          </div>
          {hasNotes ? (
            <div className="cm-notes">
              <h3>La signature olfactive</h3>
              <dl>
                {NOTE_LEVELS.filter(({ key }) => product.notes[key].length > 0).map(({ key, label }, index) => (
                  <div className="cm-notes__row" key={key} data-animate="fade-up" style={{ "--d": index * 0.12 } as React.CSSProperties}>
                    <span className="cm-notes__index" aria-hidden="true">0{index + 1}</span>
                    <dt>{label}</dt>
                    <dd>{product.notes[key].join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}

      <RelatedProducts products={related} />
      <div id={PURCHASE_END_ID} aria-hidden="true" />
    </div>
  );
}
