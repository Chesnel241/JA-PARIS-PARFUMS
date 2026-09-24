"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, hasFinePointer, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * Liste typographique « trois univers » : au survol d'une ligne, son image
 * flotte et suit le curseur (souris uniquement). Sur écran tactile, les
 * images restent visibles dans chaque ligne (CSS).
 * Chaque ligne porte `data-universe-row` et contient un `[data-universe-media]`.
 */
export function UniverseList({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const float = floatRef.current;
    if (!root || !float || !hasFinePointer() || prefersReducedMotion()) return;

    root.dataset.hover = "true";
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-universe-row]"));
    const slides = rows.map((row) => {
      const media = row.querySelector<HTMLElement>("[data-universe-media]");
      const slide = document.createElement("div");
      slide.className = "universe-float-slide";
      if (media) slide.append(media.cloneNode(true));
      float.append(slide);
      return slide;
    });

    const moveX = gsap.quickTo(float, "x", { duration: 0.7, ease: "power3.out" });
    const moveY = gsap.quickTo(float, "y", { duration: 0.7, ease: "power3.out" });
    const tilt = gsap.quickTo(float, "rotate", { duration: 0.9, ease: "power3.out" });
    let lastX = 0;

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      moveX(x);
      moveY(event.clientY - rect.top);
      tilt(gsap.utils.clamp(-8, 8, (x - lastX) * 0.4));
      lastX = x;
    };

    let active = -1;
    const show = (index: number) => {
      if (index === active) return;
      active = index;
      slides.forEach((slide, i) => {
        gsap.to(slide, { clipPath: i === index ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)", duration: 0.7, ease: "expo.out" });
      });
      gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" });
    };
    const hide = () => {
      active = -1;
      gsap.to(float, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: "power3.out" });
    };

    gsap.set(float, { autoAlpha: 0, scale: 0.85, xPercent: -50, yPercent: -50 });
    gsap.set(slides, { clipPath: "inset(100% 0% 0% 0%)" });

    const enters = rows.map((row, index) => {
      const onEnter = () => show(index);
      row.addEventListener("pointerenter", onEnter);
      return () => row.removeEventListener("pointerenter", onEnter);
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", hide);

    return () => {
      enters.forEach((off) => off());
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", hide);
      slides.forEach((slide) => slide.remove());
      delete root.dataset.hover;
    };
  }, []);

  return (
    <div ref={rootRef} className={`universe ${className}`.trim()} role="list" aria-label={label}>
      {children}
      <div ref={floatRef} className="universe-float" aria-hidden="true" />
    </div>
  );
}
