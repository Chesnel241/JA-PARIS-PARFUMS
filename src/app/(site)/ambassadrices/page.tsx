import Image from "next/image";
import { getPublicAmbassadors } from "@/lib/community-service";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { AmbassadorForm } from "@/components/site/ambassador-form";
import { PageHead } from "@/components/site/page-head";
import { getCachedSiteImages, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Le Cercle JAE, programme ambassadeurs",
    description: "Rejoignez le Cercle JAE : les nouvelles heures en avant-première, un code personnel à partager et des rencontres à Paris. Ouvert à toutes et à tous.",
    path: "/ambassadrices",
  });
}

function instagramUrl(handle: string) {
  if (/^https?:\/\//i.test(handle)) return handle;
  return `https://www.instagram.com/${encodeURIComponent(handle.replace(/^@/, "").trim())}/`;
}

function instagramHandle(handle: string) {
  const match = handle.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match ? match[1] : handle).replace(/^@/, "")}`;
}

export default async function CerclePage() {
  const [ambassadors, images] = await Promise.all([getPublicAmbassadors(), getCachedSiteImages()]);
  const portrait = images["cercle.image"];

  return (
    <>
      <PageHead
        tag="Programme ambassadeurs"
        title={<>Le <span className="serif">Cercle</span> JAE</>}
        lead="Vous aimez nos créations et vous voulez les faire rayonner ? Rejoignez celles et ceux qui portent la maison, la partagent et la font grandir. Créateurs de contenu, passionnés de parfum, étudiants ou professionnels, le Cercle est ouvert à toutes et à tous."
      />

      <section className="wrap cercle-grid" id="candidature" aria-label="Candidater au Cercle">
        <div className="cercle-left">
          <div className="cercle-portrait">
            <Image className="ph-fill" src={portrait} alt="Portrait d’une ambassadrice du Cercle JAE" fill sizes="(min-width: 980px) 40vw, 100vw" priority unoptimized={isUnoptimizedImage(portrait)} />
          </div>
          <div>
            <h2>Ce que le Cercle vous apporte</h2>
            <ul className="avantages">
              <li><strong>Les nouvelles heures en avant-première</strong><span>Vous découvrez les prochains parfums de la maison avant leur sortie.</span></li>
              <li><strong>Un code personnel</strong><span>À partager avec votre communauté, pour qu’elle profite elle aussi de la maison.</span></li>
              <li><strong>Des rencontres à Paris</strong><span>Des moments avec l’équipe, autour des matières et des créations.</span></li>
            </ul>
          </div>
          <div>
            <h2>Comment ça se passe</h2>
            <ol className="etapes">
              <li>Vous envoyez votre candidature.</li>
              <li>Nous étudions votre profil.</li>
              <li>Nous vous répondons par e-mail.</li>
            </ol>
          </div>
        </div>
        <AmbassadorForm />
      </section>

      {ambassadors.length > 0 ? (
        <section className="wrap membres" aria-labelledby="membres-title">
          <div className="sec-head"><h2 className="h-lg" id="membres-title">Ils et elles portent <span className="serif">la maison</span></h2></div>
          <ul className="membres-grid">
            {ambassadors.map((ambassador) => (
              <li key={ambassador.id} data-animate="">
                <article className="membre">
                  <div className="membre-ph">
                    <Image className="ph-fill" src={ambassador.photo} alt={`Portrait de ${ambassador.name}`} fill sizes="(min-width: 980px) 33vw, (min-width: 760px) 50vw, 100vw" unoptimized={isUnoptimizedImage(ambassador.photo)} />
                  </div>
                  <div className="membre-tx">
                    {ambassador.role ? <span className="small muted">{ambassador.role}</span> : null}
                    <h3>{ambassador.name}</h3>
                    {ambassador.description ? <p>{ambassador.description}</p> : null}
                    {ambassador.instagram ? (
                      <a href={instagramUrl(ambassador.instagram)} target="_blank" rel="noopener noreferrer">
                        {instagramHandle(ambassador.instagram)}<span className="sr-only"> (Instagram, nouvel onglet)</span>
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
