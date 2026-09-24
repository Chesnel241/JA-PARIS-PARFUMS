"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, isDesktop, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Galerie horizontale épinglée (desktop) : la section reste à l'écran pendant
 * que les panneaux défilent latéralement au rythme du défilement vertical.
 * Chaque panneau peut définir sa lueur (`data-glow`) : le fond de la section
 * s'y accorde en douceur. Sur mobile / tablette ou en mouvement réduit :
 * simple rangée à balayer (scroll-snap natif), aucune épingle.
 */
export function HorizontalCollection({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track || prefersReducedMotion()) return;

    const media = gsap.matchMedia();
    media.add("(min-width: 1024px)", () => {
      if (!isDesktop()) return;
      root.dataset.pinned = "true";
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", track);
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });

      for (const panel of panels) {
        const media = panel.querySelector("[data-panel-media]");
        if (media) {
          gsap.fromTo(media, { xPercent: 6, rotate: 3 }, {
            xPercent: -6,
            rotate: -2,
            ease: "none",
            scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          });
        }
        const glow = panel.dataset.glow;
        if (glow) {
          ScrollTrigger.create({
            trigger: panel,
            containerAnimation: tween,
            start: "left 55%",
            end: "right 55%",
            onToggle: (self) => {
              if (self.isActive) gsap.to(root, { "--glow": glow, duration: 1, ease: "power2.out" });
            },
          });
        }
      }

      return () => {
        delete root.dataset.pinned;
      };
    });

    return () => media.revert();
  }, []);

  return (
    <section ref={rootRef} className={`hcollection ${className}`.trim()} aria-labelledby={labelledBy}>
      <div ref={trackRef} className="hcollection-track">
        {children}
      </div>
      <div className="hcollection-progress" aria-hidden="true">
        <div ref={progressRef} className="hcollection-progress-bar" />
      </div>
    </section>
  );
}
