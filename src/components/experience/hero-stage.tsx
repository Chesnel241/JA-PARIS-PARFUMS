"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, hasFinePointer, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Scène du héro : profondeur au pointeur (les calques `data-depth` se
 * déplacent plus ou moins selon leur profondeur) et sortie cinématographique
 * au défilement (le titre se sépare, le visuel remonte, la scène s'assombrit).
 * Calques : `data-depth`, `data-hero-split`, `data-hero-rise`, `data-hero-fade`, `data-hero-shade`.
 */
export function HeroStage({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const context = gsap.context(() => {
      // Profondeur au pointeur (souris uniquement).
      const layers = gsap.utils.toArray<HTMLElement>("[data-depth]", root);
      let onMove: ((event: PointerEvent) => void) | null = null;
      if (hasFinePointer() && layers.length > 0) {
        const movers = layers.map((layer) => {
          const depth = Number(layer.dataset.depth) || 0;
          return {
            depth,
            x: gsap.quickTo(layer, "x", { duration: 1.2, ease: "power3.out" }),
            y: gsap.quickTo(layer, "y", { duration: 1.2, ease: "power3.out" }),
          };
        });
        onMove = (event: PointerEvent) => {
          const nx = event.clientX / window.innerWidth - 0.5;
          const ny = event.clientY / window.innerHeight - 0.5;
          for (const mover of movers) {
            mover.x(nx * mover.depth);
            mover.y(ny * mover.depth * 0.6);
          }
        };
        window.addEventListener("pointermove", onMove, { passive: true });
      }

      // Sortie au défilement. Valeurs de départ explicites : les éléments sont
      // encore en train d'apparaître (CSS) quand ces déclencheurs sont créés.
      const scroll = { trigger: root, start: "top top", end: "bottom top", scrub: true };
      gsap.fromTo(root.querySelectorAll("[data-hero-split='left']"), { xPercent: 0 }, { xPercent: -18, ease: "none", scrollTrigger: scroll });
      gsap.fromTo(root.querySelectorAll("[data-hero-split='right']"), { xPercent: 0 }, { xPercent: 14, ease: "none", scrollTrigger: scroll });
      gsap.fromTo(root.querySelectorAll("[data-hero-rise]"), { yPercent: 0, scale: 1 }, { yPercent: -12, scale: 1.04, ease: "none", scrollTrigger: scroll });
      gsap.fromTo(root.querySelectorAll("[data-hero-fade]"), { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, ease: "none", immediateRender: false, scrollTrigger: { ...scroll, end: "40% top" } });
      gsap.fromTo(root.querySelectorAll("[data-hero-shade]"), { opacity: 0 }, { opacity: 0.8, ease: "none", scrollTrigger: scroll });

      return () => {
        if (onMove) window.removeEventListener("pointermove", onMove);
      };
    }, root);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, []);

  return (
    <section ref={rootRef} className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
