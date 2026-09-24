"use client";

import { useEffect } from "react";

/**
 * Révélations au défilement pilotées par IntersectionObserver : ajoute
 * `.is-inview` aux éléments `[data-animate]` quand ils entrent à l'écran
 * (une seule fois). Les états cachés sont définis en CSS sous `.js` (classe
 * posée avant le premier affichage, donc sans clignotement) ; `.motion-ready`,
 * posée ici, désarme le filet de sécurité CSS qui révèle tout au bout de 3 s si
 * ce script ne s'exécutait jamais. Les nouveaux éléments (navigation, contenu
 * chargé ensuite) sont suivis via MutationObserver.
 */
export function ScrollAnimator() {
  useEffect(() => {
    const html = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.01 },
    );

    const scan = () => {
      document.querySelectorAll("[data-animate]:not(.is-inview)").forEach((element) => observer.observe(element));
    };

    let frame = 0;
    const scheduleScan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scan);
    };

    scan();
    html.classList.add("motion-ready");
    const mutations = new MutationObserver(scheduleScan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      html.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
