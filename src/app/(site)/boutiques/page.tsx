import Image from "next/image";
import Link from "next/link";
import { getPublicStores } from "@/lib/community-service";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { PageHead } from "@/components/site/page-head";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Points de vente",
    description: "Retrouvez JAE Paris en boutique : adresses, horaires, téléphone et itinéraire.",
    path: "/boutiques",
  });
}

function mapsUrl(parts: string[]) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(", "))}`;
}

export default async function StoresPage() {
  const stores = await getPublicStores();

  return (
    <>
      <PageHead tag="Points de vente" title={<>Nos <span className="serif">adresses</span></>} lead="Venez sentir les heures en personne, et essayer Les Ors." />
      <div className="wrap">
        {stores.length === 0 ? (
          <div className="vide" style={{ marginBottom: "clamp(40px, 6vw, 80px)" }}>
            <p>Nos adresses seront bientôt annoncées.</p>
            <p>En attendant, toute la collection est disponible en ligne, livrée sous 2 à 3 jours.</p>
            <Link className="btn" href="/boutique">Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
          </div>
        ) : (
          <ul className="lieux">
            {stores.map((store, index) => {
              const locality = [store.city, store.country].filter(Boolean).join(", ");
              return (
                <li key={store.id} data-animate="">
                  <article className="lieu">
                    <div className="lieu-ph">
                      <Image className="ph-fill" src={store.image} alt={`Boutique ${store.name}`} fill sizes="(min-width: 1100px) 25vw, 100vw" priority={index === 0} unoptimized={isUnoptimizedImage(store.image)} />
                    </div>
                    <div className="lieu-tx">
                      <span className="small muted">{store.city}</span>
                      <h2>{store.name}</h2>
                      <address>{store.address}<br />{locality}</address>
                      <p>{store.openingHours}</p>
                      {store.phone ? <p><a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a></p> : null}
                      <a href={mapsUrl([store.address, store.city, store.country])} target="_blank" rel="noopener noreferrer">
                        Itinéraire<span className="sr-only"> vers {store.name} (Google Maps, nouvel onglet)</span>
                      </a>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
