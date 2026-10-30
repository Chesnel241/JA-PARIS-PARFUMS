"use client";

import { Scene, type SceneSubject } from "@/components/maison/scene";
import { useMaison } from "@/components/maison/maison-context";

/**
 * Vignette d'un article du panier : sa photo, ou son flacon illustré aux
 * couleurs du parfum (palette lue dans le catalogue de la maison).
 */
export function ProductThumb({ slug, name, image, sizes, priority = false }: { slug: string; name: string; image: string; sizes: string; priority?: boolean }) {
  const { bySlug } = useMaison();
  const product = bySlug.get(slug);
  const subject: SceneSubject = {
    name,
    category: product?.category ?? "PARFUM",
    palette: product?.palette ?? "",
    images: [image],
  };
  return <Scene subject={subject} sizes={sizes} priority={priority} />;
}
