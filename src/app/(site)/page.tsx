import Image from "next/image";
import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { formatPrice, type Product } from "@/lib/data";
import { capitalize, listFr, numberWord, paletteOf } from "@/lib/heures";
import { allNotes, buyVariant, pickFeatured, shownVariant, sortByDay } from "@/lib/maison";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { Hero, type HeroFeatured } from "@/components/home/hero";
import { ArrowIcon, ClockIcon, LockIcon, PlusMinusIcon, ReturnIcon, TruckIcon } from "@/components/maison/icons";
import { Scene, photosOf } from "@/components/maison/scene";
import { ProductGrid } from "@/components/site/product-grid";
import { JsonLd } from "@/components/site/json-ld";
import { QuickAdd } from "@/components/site/quick-add";
import { SITE_NAME, getCachedSiteImages, getSiteUrl, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION = "JAE Paris, maison de parfum. Des eaux de parfum composées à Paris, une pour chaque heure du jour, et des bijoux dorés. Livraison offerte dès 50 €.";

export function generateMetadata() {
  return pageMetadata({ description: DESCRIPTION, path: "/" });
}

// Questions fréquentes : la première réponse cite les heures de la collection.
function faqItems(timed: Product[]) {
  const hours = timed.length > 0
    ? ` : ${listFr(timed.map((perfume) => `${(perfume.moment || perfume.hour || "").toLocaleLowerCase("fr-FR")} pour ${perfume.name}`), false)}`
    : "";
  return [
    { q: "Que veut dire « l’heure » d’un parfum ?", a: `Chaque parfum de la collection est inspiré d’un moment de la journée${hours}. C’est une inspiration, pas une règle : portez votre parfum quand vous le souhaitez.` },
    { q: "Combien coûte la livraison ?", a: "Elle est offerte dès 50 € d’achat. En dessous, elle coûte 5,90 €. Les commandes sont expédiées sous 2 à 3 jours." },
    { q: "Puis-je retourner un article ?", a: "Oui, sous 14 jours, si l’article est intact et non ouvert." },
    { q: "Comment se passe le paiement ?", a: "Le paiement est sécurisé et se fait via Lydia, après validation de votre commande." },
    { q: "Je ne sais pas quel parfum choisir.", a: "Faites le quiz « Trouver mon heure » : quatre questions sur vos moments et vos goûts, et nous vous indiquons le parfum qui vous ressemble." },
    { q: "Comment rejoindre le Cercle JAE ?", a: "Remplissez le formulaire de candidature. Nous étudions votre profil et vous répondons par e-mail." },
  ];
}

function collectionTitle(perfumes: Product[]) {
  const total = perfumes.length;
  const timed = perfumes.filter((perfume) => perfume.hour).length;
  if (total === 1) return { lead: "Un parfum,", tail: timed ? "une heure." : "une signature." };
  if (total > 1 && timed === total) return { lead: `${capitalize(numberWord(total))} parfums,`, tail: `${numberWord(total, true)} heures.` };
  return { lead: "La collection,", tail: "heure par heure." };
}

function volumesSentence(perfumes: Product[]) {
  const volumes = [...new Set(perfumes.flatMap((perfume) => perfume.variants.map((variant) => variant.volume)))];
  const numeric = volumes.map((volume) => volume.match(/^(\d+)\s*ml$/i)?.[1]);
  if (volumes.length > 1 && numeric.every(Boolean)) return ` En ${numeric.sort((a, b) => Number(a) - Number(b)).join(" ou ")} ml.`;
  return volumes.length === 1 ? ` En ${volumes[0]}.` : "";
}

/** Notes mises en avant : une de tête, deux de cœur, deux de fond. */
function signatureNotes(product: Product) {
  return [...product.notes.top.slice(0, 1), ...product.notes.heart.slice(0, 2), ...product.notes.base.slice(0, 2)];
}

function chipColor(palette: Product["palette"]) {
  const colors = paletteOf(palette);
  return colors.dark ? `color-mix(in srgb, ${colors.accent} 35%, #fff)` : colors.tint;
}

export default async function Home() {
  const [products, images] = await Promise.all([getPublicProducts(), getCachedSiteImages()]);
  const perfumes = sortByDay(products.filter((product) => product.category === ProductCategory.PARFUM));
  const featured = pickFeatured(perfumes);
  const featuredShown = featured ? shownVariant(featured) : null;
  const featuredBuy = featured ? buyVariant(featured) : null;
  const featuredPhotos = featured ? photosOf(featured) : [];
  const heroFeatured: HeroFeatured | null = featured
    ? {
        slug: featured.slug,
        name: featured.name,
        hour: featured.hour,
        meta: ["Eau de parfum", featuredShown?.volume, featuredShown ? formatPrice(featuredShown.price) : null].filter(Boolean).join(" · "),
        subject: featured,
      }
    : null;
  const title = collectionTitle(perfumes);
  const timed = perfumes.filter((perfume) => perfume.hour);
  const faq = faqItems(timed);

  // Matières : chaque note une seule fois, à la couleur du premier parfum qui la porte.
  const materials = new Map<string, string>();
  for (const perfume of perfumes) for (const note of allNotes(perfume)) if (!materials.has(note)) materials.set(note, paletteOf(perfume.palette).accent);

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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />

      <Hero
        campaign={images["home.campaign.image"]}
        campaignAlt={featured ? `Campagne ${featured.name}, JAE Paris` : "Campagne JAE Paris"}
        orsImage={images["home.ors.image"]}
        featured={heroFeatured}
      />

      <section className="garanties" aria-label="Nos engagements">
        <ul className="wrap">
          <li className="garantie"><span className="ic"><TruckIcon /></span><div><strong>Livraison offerte dès 50&nbsp;€</strong><span>Sinon 5,90&nbsp;€, expédiée en 2 à 3 jours</span></div></li>
          <li className="garantie"><span className="ic"><ReturnIcon /></span><div><strong>Retours sous 14 jours</strong><span>Article intact et non ouvert</span></div></li>
          <li className="garantie"><span className="ic"><LockIcon /></span><div><strong>Paiement sécurisé</strong><span>Via Lydia, après validation</span></div></li>
          <li className="garantie"><span className="ic"><ClockIcon /></span><div><strong>Composé à Paris</strong><span>Une collection pensée heure par heure</span></div></li>
        </ul>
      </section>

      <section className="wrap manif" aria-label="Manifeste">
        <span className="tag">Manifeste</span>
        <p className="txt" data-animate="">Un parfum ne se porte pas seulement. <span className="gris">Il reste après vous, dans un couloir, un ascenseur, sur une écharpe prêtée.</span> Chez JAE, on compose des <span className="serif">sillages</span>.</p>
        <p className="sign"><i>JAE</i> Maison de parfum, Paris</p>
        <svg className="manif-trail" viewBox="0 0 460 300" aria-hidden="true" focusable="false" data-animate="fade">
          <path pathLength={1} d="M8 250C60 240 96 196 120 150C146 100 196 70 236 96C276 122 250 190 206 186C160 182 172 112 230 84C300 50 360 92 400 60C424 40 440 22 452 10" />
        </svg>
      </section>

      {perfumes.length > 0 ? (
        <section className="wrap sec flush-top" aria-labelledby="coll-title">
          <div className="sec-head">
            <div>
              <span className="tag"><span className="dot" />La collection</span>
              <h2 className="h-lg" id="coll-title">{title.lead} <span className="serif">{title.tail}</span></h2>
            </div>
            <div className="side">
              <p className="lead">Du premier soleil à minuit, chaque eau de parfum porte une heure de lumière.{volumesSentence(perfumes)}</p>
              <Link className="lien" href="/boutique">Voir la collection <ArrowIcon /></Link>
            </div>
          </div>
          <ProductGrid products={perfumes.slice(0, 6)} label="Les parfums" />
        </section>
      ) : null}

      {featured ? (
        <section className="wrap sec flush-top" aria-labelledby="feat-title">
          <div className="feature">
            <div className="feat-vis" data-animate="">
              <div className="big">
                <Scene subject={featured} photo={featuredPhotos[3] ?? featuredPhotos[1] ?? featuredPhotos[0]} sizes="(min-width: 980px) 45vw, 90vw" alt={`${featured.name}, en situation`} />
              </div>
              {featuredPhotos.length > 1 ? (
                <div className="sm">
                  <Scene subject={featured} photo={featuredPhotos[2] ?? featuredPhotos[0]} sizes="(min-width: 980px) 20vw, 40vw" alt={`Le flacon ${featured.name}`} />
                </div>
              ) : null}
            </div>
            <div>
              {featuredBuy ? <span className="tag"><span className="dot" style={{ background: "#3E9B5A" }} />Disponible maintenant</span> : <span className="tag">Bientôt de retour</span>}
              <h2 className="p-name" id="feat-title">{featured.name}</h2>
              {featured.tagline ? <p className="p-tag">{featured.tagline}</p> : null}
              <p className="p-desc">{featured.description}</p>
              {signatureNotes(featured).length > 0 ? (
                <ul className="feat-chips" aria-label="Notes principales">
                  {signatureNotes(featured).map((note) => <li key={note}>{note}</li>)}
                </ul>
              ) : null}
              {featuredShown ? (
                <div className="buy-line">
                  <span className="price">{formatPrice(featuredShown.price)}<small>{featuredShown.volume}</small></span>
                  {featuredBuy ? <span className="stat ok">En stock</span> : <span className="stat wait">Bientôt de retour</span>}
                </div>
              ) : null}
              <div className="btn-row">
                <Link className="btn" href={`/produit/${featured.slug}`}>Découvrir {featured.name}<span className="ico"><ArrowIcon /></span></Link>
                {featuredBuy ? (
                  <QuickAdd className="btn btn-line" label={`Ajouter ${featured.name}, ${featuredBuy.volume}, au panier`} item={{ slug: featured.slug, name: featured.name, image: featured.image, volume: featuredBuy.volume, price: featuredBuy.price, stock: featuredBuy.stock }}>
                    Ajouter au panier
                  </QuickAdd>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="wrap sec flush-top" aria-labelledby="univ-title">
        <div className="sec-head">
          <div><span className="tag">L’univers JAE</span><h2 className="h-lg" id="univ-title">Plus qu’un parfum, <span className="serif">une heure à soi.</span></h2></div>
        </div>
        <div className="bento">
          <Link className="bx bx-quiz" href="/trouver-mon-heure" data-animate="">
            <span className="tag">Le quiz · 4 questions</span>
            <h3>Vous hésitez&nbsp;? Trouvez votre heure en une minute.</h3>
            <p>Vos moments, vos matières, le sillage dont vous rêvez. À la fin, votre parfum et une carte à partager en story.</p>
            {timed.length > 0 ? (
              <span className="q-dots" aria-hidden="true">
                {timed.map((perfume) => <span key={perfume.slug} className="tab" style={{ background: chipColor(perfume.palette) }}>{perfume.hour}</span>)}
              </span>
            ) : null}
          </Link>
          <Link className="bx bx-ors" href="/accessoires" data-animate="">
            <Image className="ph-fill" src={images["home.univers.ors"]} alt="" fill sizes="(min-width: 1100px) 50vw, 100vw" unoptimized={isUnoptimizedImage(images["home.univers.ors"])} />
            <span className="bx-over">
              <span><span className="small muted">Accessoires</span><h3>Les Ors</h3><span className="small muted">Boucles d’oreilles dorées aux formes sculptées</span></span>
              <span className="plus" aria-hidden="true"><ArrowIcon /></span>
            </span>
          </Link>
          {materials.size > 0 ? (
            <div className="bx bx-mat" data-animate="">
              <span className="tag">Matières</span>
              <h3>{materials.size} matières, {numberWord(perfumes.length, true)} signature{perfumes.length > 1 ? "s" : ""}.</h3>
              <ul className="chips">
                {[...materials].map(([note, color]) => <li key={note}><i style={{ background: color }} aria-hidden="true" />{note}</li>)}
              </ul>
            </div>
          ) : null}
          <Link className="bx bx-cercle" href="/ambassadrices" data-animate="">
            <Image className="ph-fill" src={images["home.univers.cercle"]} alt="" fill sizes="(min-width: 1100px) 25vw, 100vw" unoptimized={isUnoptimizedImage(images["home.univers.cercle"])} />
            <span className="tag">Ambassadeurs</span>
            <h3>Le Cercle JAE</h3>
            <p>Portez la maison, partagez-la, faites-la grandir. Ouvert à toutes et à tous.</p>
            <span className="lien">Candidater <ArrowIcon /></span>
          </Link>
        </div>
      </section>

      <section className="wrap sec flush-top" aria-labelledby="faq-title">
        <div className="faq-grid">
          <div>
            <span className="tag">Questions fréquentes</span>
            <h2 className="h-lg" id="faq-title">Bon à <span className="serif">savoir.</span></h2>
            <p className="lead">Livraison, retours, paiement, programme ambassadeurs&nbsp;: l’essentiel en quelques lignes.</p>
          </div>
          <div className="faq">
            {faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}<span className="pm" aria-hidden="true"><PlusMinusIcon /></span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
