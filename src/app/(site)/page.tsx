import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { getPublishedArticles } from "@/lib/article-service";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ProductGrid } from "@/components/site/product-grid";
import { ArticleCard } from "@/components/site/article-card";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { JsonLd } from "@/components/site/json-ld";
import { imageFit, isApiMedia } from "@/components/site/media";
import { SITE_NAME, getCachedSiteImages, getSiteUrl, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Maison de parfum parisienne : parfums, bijoux en laiton doré et programme ambassadrices. Livraison offerte dès 50 €.";

export function generateMetadata() {
  return pageMetadata({ description: DESCRIPTION, path: "/" });
}

export default async function Home() {
  const [perfumes, accessories, images, articles] = await Promise.all([
    getPublicProducts(ProductCategory.PARFUM),
    getPublicProducts(ProductCategory.ACCESSOIRE),
    getCachedSiteImages(),
    getPublishedArticles(3),
  ]);

  const hero = images["home.hero.image"];
  // « home.hero.card » alimente désormais la tuile Parfums. Tant qu'il garde son
  // ancien défaut (/craft.jpg, déjà utilisé pour les accessoires), on sert un visuel parfum.
  const perfumeTile = images["home.hero.card"] === "/craft.jpg" ? "/hero.jpg" : images["home.hero.card"];
  const tiles = [
    { title: "Parfums", text: "Eaux et extraits de parfum", href: "/boutique", image: perfumeTile },
    { title: "Accessoires", text: "Bijoux en laiton doré", href: "/accessoires", image: images["home.craft.image"] },
    { title: "Devenir ambassadrice", text: "Rejoindre le cercle JAE", href: "/ambassadrices#candidature", image: images["home.essence.image"] },
  ];
  const banner = images["home.banner.image"];
  const newsletter = images["home.newsletter.image"];

  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: `${siteUrl}/`,
      logo: `${siteUrl}/logo.png`,
      description: DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: SITE_NAME,
      url: `${siteUrl}/`,
      inLanguage: "fr-FR",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/recherche?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />

      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-media">
          <Image
            src={hero}
            alt="Campagne JAE Paris"
            fill
            priority
            sizes="(min-width: 900px) 56vw, 100vw"
            unoptimized={isApiMedia(hero)}
            className={`home-hero-img fit-${imageFit(hero)}`}
          />
        </div>
        <div className="home-hero-copy">
          <p className="eyebrow hero-in" style={{ "--i": 0 } as React.CSSProperties}>Maison de parfum — Paris</p>
          <h1 id="hero-title" className="home-hero-title hero-in" style={{ "--i": 1 } as React.CSSProperties}>
            L’art <em>du sillage</em>
          </h1>
          <div className="home-hero-actions hero-in" style={{ "--i": 2 } as React.CSSProperties}>
            <Link className="primary-button" href="/boutique">Découvrir les parfums <ArrowRight aria-hidden /></Link>
            <Link className="text-link" href="/ambassadrices#candidature">Devenir ambassadrice</Link>
          </div>
          <p className="home-hero-note hero-in" style={{ "--i": 3 } as React.CSSProperties}>Livraison offerte dès 50 €</p>
        </div>
      </section>

      <section className="section-shell home-entries" aria-label="Entrer dans la maison">
        <Stagger as="ul" className="entry-grid" gap={0.12}>
          {tiles.map((tile) => (
            <StaggerItem as="li" key={tile.href}>
              <Link className="entry-tile" href={tile.href}>
                <div className="entry-tile-media">
                  <Image src={tile.image} alt="" fill sizes="(min-width: 760px) 31vw, 80vw" unoptimized={isApiMedia(tile.image)} className="entry-tile-img" />
                </div>
                <div className="entry-tile-caption">
                  <div>
                    <h2 className="entry-tile-title">{tile.title}</h2>
                    <p>{tile.text}</p>
                  </div>
                  <ArrowRight aria-hidden className="entry-tile-arrow" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {perfumes.length > 0 ? (
        <section className="section-shell home-section" aria-labelledby="parfums-title">
          <Reveal as="header" className="section-heading">
            <div>
              <p className="eyebrow">La collection</p>
              <h2 id="parfums-title">Les parfums</h2>
            </div>
            <Link className="text-link" href="/boutique">Tout voir <ArrowRight aria-hidden /></Link>
          </Reveal>
          <ProductGrid products={perfumes.slice(0, 4)} />
        </section>
      ) : null}

      <section className="home-banner" aria-labelledby="banner-title">
        <Reveal className="home-banner-media" y={0}>
          <Image src={banner} alt="Flacon JAE Paris" fill sizes="(min-width: 900px) 50vw, 100vw" unoptimized={isApiMedia(banner)} className="home-banner-img" />
        </Reveal>
        <Reveal className="home-banner-copy" delay={0.1}>
          <p className="eyebrow">Signature</p>
          <h2 id="banner-title">Un sillage qui vous ressemble</h2>
          <Link className="primary-button" href="/boutique">Trouver le vôtre <ArrowRight aria-hidden /></Link>
        </Reveal>
      </section>

      {accessories.length > 0 ? (
        <section className="section-shell home-section home-accessories" aria-labelledby="accessoires-title">
          <Reveal className="home-accessories-intro">
            <p className="eyebrow">Accessoires</p>
            <h2 id="accessoires-title">Bijoux en laiton doré</h2>
            <Link className="text-link" href="/accessoires">Tout voir <ArrowRight aria-hidden /></Link>
          </Reveal>
          <ProductGrid products={accessories.slice(0, 2)} className="home-accessories-grid" />
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="section-shell home-section" aria-labelledby="journal-title">
          <Reveal as="header" className="section-heading">
            <div>
              <p className="eyebrow">Journal</p>
              <h2 id="journal-title">Histoires de la maison</h2>
            </div>
            <Link className="text-link" href="/journal">Tous les articles <ArrowRight aria-hidden /></Link>
          </Reveal>
          <Stagger as="ul" className="article-grid">
            {articles.map((article) => (
              <StaggerItem as="li" key={article.id}>
                <ArticleCard article={article} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      <section className="home-newsletter" aria-labelledby="newsletter-title">
        <div className="home-newsletter-media">
          <Image src={newsletter} alt="" fill sizes="(min-width: 900px) 45vw, 100vw" unoptimized={isApiMedia(newsletter)} className="home-newsletter-img" />
        </div>
        <Reveal className="home-newsletter-copy">
          <p className="eyebrow">Le cercle JAE</p>
          <h2 id="newsletter-title">Nouveautés et avant-premières</h2>
          <NewsletterForm />
        </Reveal>
      </section>
    </>
  );
}
