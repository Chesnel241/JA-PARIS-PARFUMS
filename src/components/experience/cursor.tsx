"use client";

import { useEffect, useRef } from "react";
import { gsap, hasFinePointer, prefersReducedMotion } from "@/components/experience/gsap";

const INTERACTIVE = "a[href], button:not([disabled]), [role='button'], label, summary, select";
const TEXT_ENTRY = "input:not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='button']), textarea, [contenteditable='true']";

/**
 * Curseur sur mesure (souris uniquement) : un point précis et un anneau qui le
 * suit avec inertie. L'anneau grossit sur les éléments cliquables et affiche
 * une étiquette sur les éléments porteurs de `data-cursor="Voir"`.
 * Les éléments `data-magnetic` sont attirés par le pointeur.
 * Masqué au-dessus des champs de saisie (le curseur texte natif reprend la main).
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label || !hasFinePointer() || prefersReducedMotion()) return;

    const html = document.documentElement;
    html.classList.add("has-cursor");

    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3.out" });

    let visible = false;
    let magnet: HTMLElement | null = null;
    let state = "";

    const setState = (next: string, text = "") => {
      if (next === state && label.textContent === text) return;
      state = next;
      ring.dataset.state = next;
      dot.dataset.state = next;
      label.textContent = text;
    };

    const releaseMagnet = () => {
      if (!magnet) return;
      gsap.to(magnet, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
      magnet = null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set([dot, ring], { x: event.clientX, y: event.clientY });
        html.classList.add("cursor-visible");
      }
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);

      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest(TEXT_ENTRY)) {
        setState("text");
      } else {
        const labelled = target.closest<HTMLElement>("[data-cursor]");
        if (labelled) setState("label", labelled.dataset.cursor ?? "");
        else if (target.closest(INTERACTIVE)) setState("link");
        else setState("");
      }

      const magnetic = target.closest<HTMLElement>("[data-magnetic]");
      if (magnetic !== magnet) releaseMagnet();
      if (magnetic) {
        magnet = magnetic;
        const rect = magnetic.getBoundingClientRect();
        const strength = Number(magnetic.dataset.magnetic) || 0.3;
        gsap.to(magnetic, {
          x: (event.clientX - (rect.left + rect.width / 2)) * strength,
          y: (event.clientY - (rect.top + rect.height / 2)) * strength,
          duration: 0.6,
          ease: "power3.out",
        });
      }
    };

    const onLeave = () => {
      visible = false;
      html.classList.remove("cursor-visible");
      releaseMagnet();
    };
    const onDown = () => ring.classList.add("is-pressed");
    const onUp = () => ring.classList.remove("is-pressed");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      releaseMagnet();
      html.classList.remove("has-cursor", "cursor-visible");
    };
  }, []);

  return (
    <div className="cursor-layer" aria-hidden="true">
      <div ref={ringRef} className="cursor-ring">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
