"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, hasFinePointer, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Défilement lissé (Lenis) synchronisé avec GSAP ScrollTrigger, sur une seule
 * boucle d'animation. Désactivé sur écran tactile (le défilement natif y est
 * meilleur) et si l'utilisateur préfère réduire les animations.
 * Se met en pause dès qu'une fenêtre modale verrouille la page
 * (overflow: hidden sur <html> ou <body> : menu mobile, tiroir panier, visionneuse).
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  // Les polices web décalent la mise en page à leur arrivée : on recalcule
  // alors les positions de tous les déclencheurs (épingles, parallaxes).
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion() || !hasFinePointer()) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      anchors: { offset: -96 },
      autoRaf: false,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const html = document.documentElement;
    const body = document.body;
    const syncLock = () => {
      const locked = html.style.overflow === "hidden" || body.style.overflow === "hidden";
      if (locked) lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(html, { attributes: true, attributeFilter: ["style"] });
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    syncLock();

    return () => {
      observer.disconnect();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Changement de page : Next.js (ou le navigateur, sur « Précédent ») a déjà
  // positionné la page ; on aligne Lenis dessus pour annuler un défilement lissé
  // encore en cours, puis on recalcule les déclencheurs de la nouvelle page.
  useEffect(() => {
    const lenis = lenisRef.current;
    lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
    const frame = window.requestAnimationFrame(() => {
      lenis?.resize();
      ScrollTrigger.refresh();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
