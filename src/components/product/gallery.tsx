"use client";

import { useState } from "react";
import Image from "next/image";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { Scene, photosOf, type SceneSubject } from "@/components/maison/scene";

/**
 * Galerie de la fiche : grande image et vignettes (jusqu'à 4). Sans photo,
 * le flacon illustré aux couleurs du parfum prend la place.
 */
export function ProductGallery({ subject, badge }: { subject: SceneSubject; badge?: string }) {
  const photos = photosOf(subject).slice(0, 8);
  const [index, setIndex] = useState(0);
  const current = photos[index];

  return (
    <div className="p-gal">
      <div className="p-main">
        {current ? (
          <div className="scene photo">
            <Image key={current} src={current} alt={index === 0 ? subject.name : `${subject.name}, vue ${index + 1}`} fill priority={index === 0} sizes="(min-width: 980px) 52vw, 100vw" unoptimized={isUnoptimizedImage(current)} className="ph-fill" />
          </div>
        ) : (
          <Scene subject={subject} priority sizes="(min-width: 980px) 52vw, 100vw" />
        )}
        {badge ? <span className="chip tab">{badge}</span> : null}
      </div>
      {photos.length > 1 ? (
        <div className="p-thumbs" role="group" aria-label={`Photos de ${subject.name}`}>
          {photos.slice(0, 4).map((photo, position) => (
            <button key={`${photo}-${position}`} type="button" aria-pressed={position === index} aria-label={`Photo ${position + 1} sur ${Math.min(photos.length, 4)}`} onClick={() => setIndex(position)}>
              <Image src={photo} alt="" fill sizes="120px" unoptimized={isUnoptimizedImage(photo)} className="ph-fill" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
