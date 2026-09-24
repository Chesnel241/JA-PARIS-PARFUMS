"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Bandeau défilant infini dont la vitesse et le sens suivent le défilement de
 * la page (effet « vélocité »), avec une légère inclinaison. Le contenu est
 * dupliqué une fois (copie masquée aux lecteurs d'écran).
 */
export function Marquee({ children, className = "", speed = 60, label }: { children: ReactNode; className?: string; speed?: number; label?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track || prefersReducedMotion()) return;

    let settle: (() => void) | null = null;
    const context = gsap.context(() => {
      const loop = gsap.to(track, { xPercent: -50, duration: speed, ease: "none", repeat: -1 });
      const skew = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3.out" });
      let direction = 1;
      let lastScroll = 0;
      let skewed = false;
      ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const velocity = self.getVelocity();
          if (self.direction !== direction) direction = self.direction;
          const boost = gsap.utils.clamp(-6, 6, velocity / 260);
          gsap.to(loop, { timeScale: direction * (1 + Math.abs(boost)), duration: 0.4, overwrite: true });
          skew(gsap.utils.clamp(-7, 7, -velocity / 420));
          lastScroll = performance.now();
          skewed = true;
        },
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });
      // Retour progressif à la vitesse de croisière quand le défilement s'arrête.
      settle = () => {
        const current = loop.timeScale();
        if (Math.abs(current - direction) > 0.01) loop.timeScale(current + (direction - current) * 0.04);
        if (skewed && performance.now() - lastScroll > 140) {
          skewed = false;
          skew(0);
        }
      };
      gsap.ticker.add(settle);
    }, root);

    return () => {
      if (settle) gsap.ticker.remove(settle);
      context.revert();
    };
  }, [speed]);

  return (
    <div ref={rootRef} className={`marquee ${className}`.trim()} role="marquee" aria-label={label}>
      <div ref={trackRef} className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
