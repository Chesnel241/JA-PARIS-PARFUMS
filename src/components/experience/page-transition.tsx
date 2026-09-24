"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/components/experience/gsap";

// Chemins hors de la boutique (autre layout) : navigation classique, sans rideau.
const EXCLUDED = /^\/(admin|connexion-admin|api)(\/|$)/;

type Phase = "idle" | "covering" | "covered";

/**
 * Transition entre pages : un rideau d'encre (précédé d'un voile bronze) monte
 * et couvre l'écran, la navigation part, puis le rideau se lève sur la
 * nouvelle page. Interception en phase de capture des clics sur les liens
 * internes (avant <Link>, qui renonce à naviguer quand l'évènement est déjà
 * « preventDefault »). Ignorés : modificateurs (nouvel onglet), liens externes,
 * téléchargements, même page (ancres, filtres), `data-no-transition`,
 * `aria-haspopup` (tiroir panier), préférences de mouvement réduit.
 */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const phase = useRef<Phase>("idle");
  const safety = useRef<number | undefined>(undefined);

  const reveal = useCallback(() => {
    const root = rootRef.current;
    window.clearTimeout(safety.current);
    if (!root || phase.current === "idle") return;
    const html = document.documentElement;
    html.dataset.transition = "reveal";
    gsap.timeline({
      onComplete: () => {
        phase.current = "idle";
        root.dataset.active = "false";
        delete html.dataset.transition;
      },
    })
      .to(root.querySelector(".curtain-mark"), { autoAlpha: 0, y: -24, duration: 0.35, ease: "power2.in" })
      .to(root.querySelector(".curtain-panel.is-front"), { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 0.05)
      .to(root.querySelector(".curtain-panel.is-back"), { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 0.14);
  }, []);

  const cover = useCallback((href: string) => {
    const root = rootRef.current;
    if (!root) {
      router.push(href);
      return;
    }
    phase.current = "covering";
    root.dataset.active = "true";
    document.documentElement.dataset.transition = "cover";
    const front = root.querySelector(".curtain-panel.is-front");
    const back = root.querySelector(".curtain-panel.is-back");
    const mark = root.querySelector(".curtain-mark");
    gsap.set([front, back], { yPercent: 100 });
    gsap.set(mark, { autoAlpha: 0, y: 24 });
    gsap.timeline({
      onComplete: () => {
        phase.current = "covered";
        router.push(href);
        // Filet de sécurité : si la nouvelle page n'arrive jamais, on relève le rideau.
        safety.current = window.setTimeout(reveal, 6000);
      },
    })
      .to(back, { yPercent: 0, duration: 0.62, ease: "expo.inOut" })
      .to(front, { yPercent: 0, duration: 0.62, ease: "expo.inOut" }, 0.08)
      .to(mark, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.42);
  }, [reveal, router]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor) return;
      if (phase.current !== "idle") {
        event.preventDefault();
        return;
      }
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      if (anchor.hasAttribute("data-no-transition") || anchor.hasAttribute("aria-haspopup")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || EXCLUDED.test(url.pathname)) return;
      if (url.pathname === window.location.pathname) return;
      if (prefersReducedMotion()) return;
      event.preventDefault();
      cover(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cover]);

  // La nouvelle page est rendue : on lève le rideau.
  useEffect(() => {
    if (phase.current === "covered") reveal();
  }, [pathname, reveal]);

  useEffect(() => () => window.clearTimeout(safety.current), []);

  return (
    <div ref={rootRef} className="curtain" data-active="false" aria-hidden="true">
      <div className="curtain-panel is-back" />
      <div className="curtain-panel is-front">
        <div className="curtain-mark">
          <span>JAE</span>
          <small>Paris</small>
        </div>
      </div>
    </div>
  );
}
