import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { getPublishedArticles } from "@/lib/article-service";
import { formatPrice } from "@/lib/data";
import { Stagger, StaggerItem } from "@/components/motion";
import { ProductCard } from "@/components/product-card";
import { ArticleCard } from "@/components/site/article-card";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { JsonLd } from "@/components/site/json-ld";
import { imageFit, isApiMedia } from "@/components/site/media";
import { SITE_NAME, getCachedSiteImages, getSiteUrl, pageMetadata } from "@/components/site/seo";
import { RevealText } from "@/components/experience/reveal-text";
import { SillageCanvas } from "@/components/experience/sillage-canvas";
import { HeroStage } from "@/components/experience/hero-stage";
import { Marquee } from "@/components/experience/marquee";
import { ScrubText } from "@/components/experience/scrub-text";
import { HorizontalCollection } from "@/components/experience/horizontal-collection";
import { UniverseList } from "@/components/experience/universe-list";
import { ExpandBanner } from "@/components/experience/expand-banner";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Maison de parfum parisienne : parfums, bijoux en laiton doré et programme ambassadrices. Livraison offerte dès 50 €.";

// Lueurs successives de la galerie horizontale (bronze, or, rose poudré, ambre).
const GLOWS = ["#7a5c30", "#b48a4f", "#9c5d5d", "#8a6a3a"];

export function generateMetadata() {
  return pageMetadata({ description: DESCRIPTION, path: "/" });
}

function minPrice(prices: number[]) {
  return prices.length > 0 ? Math.min(...prices) : 0;
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
  // « home.hero.card » alimente la ligne Parfums. Tant qu'il garde son ancien
  // défaut (/craft.jpg, déjà utilisé pour les accessoires), on sert un visuel parfum.
  const perfumeVisual = images["home.hero.card"] === "/craft.jpg" ? "/hero.jpg" : images["home.hero.card"];
  const universes = [
    { title: "Parfums", text: "Eaux & extraits", href: "/boutique", image: perfumeVisual },
    { title: "Accessoires", text: "Laiton doré", href: "/accessoires", image: images["home.craft.image"] },
    { title: "Ambassadrices", text: "Rejoindre le cercle", href: "/ambassadrices#candidature", image: images["home.essence.image"] },
  ];
  const banner = images["home.banner.image"];
  const newsletter = images["home.newsletter.image"];
  const names = [...perfumes, ...accessories].map((product) => product.name);
  const marqueeItems = names.length > 0 ? [...names, ...names] : ["JAE Paris", "L’art du sillage", "JAE Paris", "L’art du sillage"];

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

      {/* 1 — Héro de nuit : la fumée dorée suit le pointeur, le visuel passe devant le titre. */}
      <HeroStage className={`hero${heroCutout ? " is-cutout" : " is-photo"}`} labelledBy="hero-title">
        <div className="hero-bg" aria-hidden="true">
          <SillageCanvas tone="night" />
        </div>
        {heroCutout ? null : (
          <div className="hero-photo" data-hero-rise aria-hidden="true">
            <Image src={hero} alt="" fill priority sizes="100vw" unoptimized={isApiMedia(hero)} className="hero-photo-img" />
          </div>
        )}
        <div className="hero-veil" aria-hidden="true" />

        <p className="hero-eyebrow" data-hero-fade>
          <span className="hero-rule" aria-hidden="true" />Maison de parfum · Paris
        </p>

        <h1 id="hero-title" className="hero-title">
          <span className="hero-line is-first" data-hero-split="left">
            <span className="hero-depth" data-depth="-16"><RevealText mode="load" delay={0.25}>L’art</RevealText></span>
          </span>
          <span className="hero-line is-second" data-hero-split="right">
            <span className="hero-depth" data-depth="-30"><RevealText mode="load" delay={0.4}><em>du sillage</em></RevealText></span>
          </span>
        </h1>

        {heroCutout ? (
          <div className="hero-figure" data-hero-rise>
            <div className="hero-depth" data-depth="22">
              <Image src={hero} alt="Campagne JAE Paris" width={769} height={1024} priority sizes="(min-width: 1024px) 34vw, 70vw" unoptimized={isApiMedia(hero)} className="hero-figure-img" />
            </div>
          </div>
        ) : null}

        <div className="hero-foot" data-hero-fade>
          <div className="hero-actions">
            <Link className="primary-button light" href="/boutique" data-magnetic="0.25">
              Découvrir les parfums <ArrowRight aria-hidden />
            </Link>
            <Link className="text-link light" href="/ambassadrices#candidature">Devenir ambassadrice</Link>
          </div>
          <p className="hero-note">Livraison offerte dès 50 €</p>
        </div>

        <div className="hero-shade" data-hero-shade aria-hidden="true" />

        <div className="hero-scroll" aria-hidden="true">
          <span>Défiler</span>
          <i />
        </div>
      </HeroStage>

      {/* 2 — Bandeau des créations, sensible à la vitesse du défilement. */}
      <Marquee className="names-marquee" label="Nos créations" speed={48}>
        {marqueeItems.map((name, index) => (
          <span className="marquee-item" key={`${name}-${index}`}>
            {index % 2 === 0 ? name : <em>{name}</em>}
            <i aria-hidden="true">✦</i>
          </span>
        ))}
      </Marquee>

      {/* 3 — Manifeste : les mots s'allument au fil du défilement. */}
      <section className="manifesto section-shell" aria-labelledby="manifesto-title">
        <p className="eyebrow" data-animate="fade-up">La maison</p>
        <ScrubText>
          <h2 id="manifesto-title" className="manifesto-text">
            <RevealText>Un parfum ne se porte pas.</RevealText>{" "}
            <span className="inline-media" data-scrub-item aria-hidden="true">
              <Image src={images["home.essence.image"]} alt="" fill sizes="160px" unoptimized={isApiMedia(images["home.essence.image"])} />
            </span>{" "}
            <RevealText>Il se devine, il se souvient</RevealText>{" "}
            <span className="inline-media is-round" data-scrub-item aria-hidden="true">
              <Image src={images["home.craft.image"]} alt="" fill sizes="120px" unoptimized={isApiMedia(images["home.craft.image"])} />
            </span>{" "}
            <RevealText><em>et il reste.</em></RevealText>
          </h2>
        </ScrubText>
      </section>

      {/* 4 — La collection : galerie horizontale épinglée (desktop), rangée à balayer (mobile). */}
      {perfumes.length > 0 ? (
        <HorizontalCollection className="collection" labelledBy="collection-title">
          <div className="hpanel-intro" data-panel>
            <p className="eyebrow">La collection</p>
            <h2 id="collection-title"><RevealText>Les parfums <em>de la maison</em></RevealText></h2>
            <p className="hpanel-hint"><span aria-hidden="true" />Faites défiler</p>
          </div>
          {perfumes.map((product, index) => {
            const image = product.images[0] ?? product.image;
            const notes = [...product.notes.top, ...product.notes.heart].slice(0, 3);
            const prices = product.variants.map((variant) => variant.price);
            return (
              <article className="hpanel" data-panel data-glow={GLOWS[index % GLOWS.length]} key={product.slug}>
                <Link className="hpanel-link" href={`/produit/${product.slug}`} data-cursor="Découvrir">
                  <span className="hpanel-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div className={`hpanel-media fit-${imageFit(image)}`} data-panel-media>
                    <Image src={image} alt={product.name} fill loading="eager" sizes="(min-width: 1024px) 34vw, 78vw" unoptimized={isApiMedia(image)} />
                  </div>
                  <div className="hpanel-body">
                    <h3 className="hpanel-title">{product.name}</h3>
                    {notes.length > 0 ? <p className="hpanel-notes">{notes.join(" · ")}</p> : null}
                    <p className="hpanel-price">{new Set(prices).size > 1 ? "À partir de " : ""}{formatPrice(minPrice(prices))}</p>
                  </div>
                </Link>
              </article>
            );
          })}
          <div className="hpanel hpanel-end" data-panel>
            <Link className="hpanel-all" href="/boutique" data-cursor="Tout voir">
              <span>Toute la</span> <em>collection</em>
              <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </HorizontalCollection>
      ) : null}

      {/* 5 — Trois univers : l'image flotte et suit le curseur. */}
      <section className="universe-section section-shell" aria-labelledby="universe-title">
        <div className="universe-head">
          <p className="eyebrow" data-animate="fade-up">Entrer dans la maison</p>
          <h2 id="universe-title" className="sr-only">Nos univers</h2>
        </div>
        <UniverseList label="Nos univers">
          {universes.map((universe, index) => (
            <div className="universe-row" role="listitem" data-universe-row key={universe.href}>
              <Link className="universe-link" href={universe.href} data-cursor="Entrer">
                <span className="universe-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="universe-name"><RevealText delay={index * 0.08}>{universe.title}</RevealText></span>
                <span className="universe-text">{universe.text}</span>
                <span className="universe-thumb" data-universe-media>
                  <Image src={universe.image} alt="" fill sizes="(min-width: 1024px) 26vw, 30vw" unoptimized={isApiMedia(universe.image)} />
                </span>
                <ArrowUpRight className="universe-arrow" aria-hidden />
              </Link>
            </div>
          ))}
        </UniverseList>
      </section>

      {/* 6 — Signature : la fenêtre s'ouvre en plein écran. */}
      <ExpandBanner className="signature" labelledBy="signature-title">
        <div className="signature-sticky">
          <div className="signature-frame" data-expand-frame>
            <Image src={banner} alt="Flacon JAE Paris" fill sizes="100vw" unoptimized={isApiMedia(banner)} className="signature-img" data-expand-image="" />
            <div className="signature-shade" aria-hidden="true" />
          </div>
          <div className="signature-copy" data-expand-copy>
            <p className="eyebrow">Signature</p>
            <h2 id="signature-title">Un sillage <em>qui vous ressemble</em></h2>
            <Link className="primary-button light" href="/boutique" data-magnetic="0.25">
              Trouver le vôtre <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
      </ExpandBanner>

      {/* 7 — Accessoires : l'or se porte aussi. */}
      {accessories.length > 0 ? (
        <section className="jewels section-shell" aria-labelledby="jewels-title">
          <div className="jewels-intro">
            <p className="eyebrow" data-animate="fade-up">Accessoires</p>
            <h2 id="jewels-title"><RevealText>L’or <em>se porte aussi</em></RevealText></h2>
            <Link className="text-link" href="/accessoires" data-animate="fade-up">Tous les bijoux <ArrowRight aria-hidden /></Link>
          </div>
          <Stagger as="ul" className="jewels-grid" label="Accessoires" gap={0.12}>
            {accessories.slice(0, 2).map((product, index) => (
              <StaggerItem as="li" key={product.slug} className={index === 1 ? "is-offset" : undefined}>
                <ProductCard product={product} sizes="(min-width: 900px) 30vw, 50vw" />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {/* 8 — Journal. */}
      {articles.length > 0 ? (
        <section className="section-shell home-journal" aria-labelledby="journal-title">
          <header className="section-heading">
            <div>
              <p className="eyebrow" data-animate="fade-up">Journal</p>
              <h2 id="journal-title"><RevealText>Histoires <em>de la maison</em></RevealText></h2>
            </div>
            <Link className="text-link" href="/journal" data-animate="fade-up">Tous les articles <ArrowRight aria-hidden /></Link>
          </header>
          <Stagger as="ul" className="article-grid" gap={0.12}>
            {articles.map((article) => (
              <StaggerItem as="li" key={article.id}>
                <ArticleCard article={article} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {/* 9 — Le cercle JAE : la fumée revient, plus discrète. */}
      <section className="circle" aria-labelledby="newsletter-title">
        <div className="circle-bg" aria-hidden="true">
          <SillageCanvas tone="night" intensity={0.7} />
        </div>
        <div className="circle-media" data-animate="clip">
          <Image src={newsletter} alt="" fill sizes="(min-width: 900px) 40vw, 100vw" unoptimized={isApiMedia(newsletter)} className="circle-img" data-parallax="0.08" />
        </div>
        <div className="circle-copy">
          <p className="eyebrow" data-animate="fade-up">Le cercle JAE</p>
          <h2 id="newsletter-title"><RevealText>Nouveautés <em>&amp; avant-premières</em></RevealText></h2>
          <div data-animate="fade-up" style={{ "--d": 0.2 } as React.CSSProperties}>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
