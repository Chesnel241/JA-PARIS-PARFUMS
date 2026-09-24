"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Parallaxe déclarative pour toutes les pages : tout élément
 * `data-parallax="0.15"` se décale verticalement de ±15 % de sa hauteur
 * pendant sa traversée de l'écran. Idéal pour les images dans un cadre
 * `overflow: hidden` (prévoir un léger agrandissement en CSS).
 */
export function Parallax() {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let context: gsap.Context | null = null;
    const frame = window.requestAnimationFrame(() => {
      context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          const amount = Number(element.dataset.parallax) || 0.12;
          gsap.fromTo(
            element,
            { yPercent: -amount * 100 },
            { yPercent: amount * 100, ease: "none", scrollTrigger: { trigger: element.parentElement ?? element, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      context?.revert();
    };
  }, [pathname]);

  return null;
}
