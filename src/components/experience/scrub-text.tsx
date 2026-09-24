"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Texte qui « s'allume » mot à mot au rythme du défilement. Les mots sont
 * découpés côté serveur (RevealText) ; sans JavaScript ou en mouvement
 * réduit, le texte est simplement affiché.
 */
export function ScrubText({ children, className = "" }: { children: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const words = root.querySelectorAll(".w-in, [data-scrub-item]");
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.05,
          scrollTrigger: { trigger: root, start: "top 78%", end: "bottom 42%", scrub: 0.6 },
        },
      );
    }, root);
    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className={`scrub-text ${className}`.trim()}>
      {children}
    </div>
  );
}
