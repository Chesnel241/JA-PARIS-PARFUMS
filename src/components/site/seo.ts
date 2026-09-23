import { cache } from "react";
import type { Metadata } from "next";
import { getSiteImages } from "@/lib/site-settings";

export const SITE_NAME = "JAE Paris";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://jaeparis.com").replace(/\/+$/, "");
}

/** Images du site, dédupliquées sur la durée d'une requête (métadonnées + rendu). */
export const getCachedSiteImages = cache(getSiteImages);

/** Image de partage par défaut : la bannière de l'accueil (photo, administrable). */
export async function getDefaultShareImage() {
  const images = await getCachedSiteImages();
  return images["home.banner.image"];
}

/**
 * Métadonnées complètes d'une page publique : titre, description, canonical,
 * Open Graph et Twitter. Les URL relatives sont résolues via metadataBase.
 */
export async function pageMetadata({ title, description, path, image, type = "website", publishedTime }: {
  title?: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
}): Promise<Metadata> {
  const shareImage = image || (await getDefaultShareImage());
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Maison de parfum parisienne`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: "fr_FR",
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [{ url: shareImage, alt: title ?? SITE_NAME }],
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage] },
  };
}
