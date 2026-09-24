"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Bannière « fenêtre » : l'image démarre dans un cadre étroit et s'ouvre en
 * plein écran au fil du défilement, pendant que le titre se révèle.
 * En mouvement réduit : image plein cadre, statique.
 */
export function ExpandBanner({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const frame = root.querySelector("[data-expand-frame]");
      const image = root.querySelector("[data-expand-image]");
      const copy = root.querySelector("[data-expand-copy]");
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 85%", end: "bottom bottom", scrub: 0.7 },
      });
      timeline
        .fromTo(frame, { clipPath: "inset(18% 30% 18% 30% round 220px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
        .fromTo(image, { scale: 1.35 }, { scale: 1, ease: "none" }, 0)
        .fromTo(copy, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.35 }, 0.6);
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section ref={rootRef} className={`expand-banner ${className}`.trim()} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
