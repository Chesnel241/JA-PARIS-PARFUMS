import Image from "next/image";
import Link from "next/link";
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
  const heroCutout = imageFit(hero) === "contain";
  // « home.hero.card » alimente la tuile Parfums. Tant qu'il garde son ancien
  // défaut (/craft.jpg, déjà utilisé pour les accessoires), on sert un visuel parfum.
  const perfumeVisual = images["home.hero.card"] === "/craft.jpg" ? "/hero.jpg" : images["home.hero.card"];
  const categories = [
    { title: "Parfums", text: "Eaux & extraits de parfum", href: "/boutique", image: perfumeVisual },
    { title: "Accessoires", text: "Bijoux en laiton doré", href: "/accessoires", image: images["home.craft.image"] },
  ];
  const banner = images["home.banner.image"];
  const ambassador = images["home.essence.image"];
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

      {/* Campagne plein cadre */}
      <section className={`campaign${heroCutout ? " is-cutout" : " is-photo"}`} aria-labelledby="hero-title">
        <div className="campaign-media">
          <Image
            src={hero}
            alt={heroCutout ? "Campagne JAE Paris" : ""}
            fill
            priority
            sizes={heroCutout ? "(min-width: 900px) 50vw, 100vw" : "100vw"}
            unoptimized={isApiMedia(hero)}
            className="campaign-img"
          />
        </div>
        <div className="campaign-copy" data-load-fade="">
          <p className="campaign-kicker">Maison de parfum · Paris</p>
          <h1 id="hero-title" className="campaign-title">L’art du sillage</h1>
          <p className="campaign-text">Eaux de parfum et bijoux dorés, composés à Paris.</p>
          <div className="campaign-actions">
            <Link className="primary-button light" href="/boutique">Découvrir</Link>
            <Link className="primary-button outline-light" href="/ambassadrices#candidature">Devenir ambassadrice</Link>
          </div>
        </div>
      </section>

      {/* Deux univers */}
      <section className="split-push" aria-label="Nos univers">
        {categories.map((category) => (
          <Link key={category.href} href={category.href} className="split-tile" data-animate="fade">
            <Image src={category.image} alt="" fill sizes="(min-width: 760px) 50vw, 100vw" unoptimized={isApiMedia(category.image)} className="split-img" />
            <span className="split-copy">
              <span className="split-title">{category.title}</span>
              <span className="split-text">{category.text}</span>
              <span className="split-cta">Découvrir</span>
            </span>
          </Link>
        ))}
      </section>

      {perfumes.length > 0 ? (
        <section className="section-shell shelf" aria-labelledby="parfums-title">
          <header className="shelf-head" data-animate="fade-up">
            <h2 id="parfums-title">Les parfums</h2>
            <Link className="text-link" href="/boutique">Tout voir</Link>
          </header>
          <ProductGrid products={perfumes.slice(0, 4)} />
        </section>
      ) : null}

      {/* Bannière éditoriale */}
      <section className="editorial" aria-labelledby="signature-title">
        <Image src={banner} alt="Flacon JAE Paris" fill sizes="100vw" unoptimized={isApiMedia(banner)} className="editorial-img" />
        <div className="editorial-copy" data-animate="fade-up">
          <p className="campaign-kicker">Signature</p>
          <h2 id="signature-title">Un sillage qui vous ressemble</h2>
          <Link className="primary-button light" href="/boutique">Trouver le vôtre</Link>
        </div>
      </section>

      {accessories.length > 0 ? (
        <section className="section-shell shelf" aria-labelledby="bijoux-title">
          <header className="shelf-head" data-animate="fade-up">
            <h2 id="bijoux-title">Les bijoux</h2>
            <Link className="text-link" href="/accessoires">Tout voir</Link>
          </header>
          <ProductGrid products={accessories.slice(0, 4)} />
        </section>
      ) : null}

      {/* Ambassadrices */}
      <section className="section-shell duo" aria-labelledby="ambassadrices-title">
        <div className="duo-media" data-animate="fade">
          <Image src={ambassador} alt="" fill sizes="(min-width: 900px) 50vw, 100vw" unoptimized={isApiMedia(ambassador)} />
        </div>
        <Reveal className="duo-copy">
          <p className="campaign-kicker">Programme ambassadrices</p>
          <h2 id="ambassadrices-title">Rejoignez le cercle JAE</h2>
          <p>Portez nos créations, partagez-les et faites grandir la maison avec nous.</p>
          <Link className="primary-button" href="/ambassadrices#candidature">Devenir ambassadrice</Link>
        </Reveal>
      </section>

      {articles.length > 0 ? (
        <section className="section-shell shelf" aria-labelledby="journal-title">
          <header className="shelf-head" data-animate="fade-up">
            <h2 id="journal-title">Le journal</h2>
            <Link className="text-link" href="/journal">Tous les articles</Link>
          </header>
          <Stagger as="ul" className="article-grid">
            {articles.map((article) => (
              <StaggerItem as="li" key={article.id}>
                <ArticleCard article={article} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {/* Newsletter */}
      <section className="news-band" aria-labelledby="newsletter-title">
        <div className="news-band-media" aria-hidden="true">
          <Image src={newsletter} alt="" fill sizes="(min-width: 900px) 40vw, 100vw" unoptimized={isApiMedia(newsletter)} />
        </div>
        <div className="news-band-copy">
          <p className="campaign-kicker">Le cercle JAE</p>
          <h2 id="newsletter-title">Nouveautés et avant-premières</h2>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
