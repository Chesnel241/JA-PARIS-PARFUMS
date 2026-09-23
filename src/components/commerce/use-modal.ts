"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableIn(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute("inert") && element.getClientRects().length > 0,
  );
}

// Comportement commun des fenêtres modales (tiroir panier, visionneuse) :
// focus piégé, Échap pour fermer, défilement de la page bloqué, reste de la
// page rendu inerte, et retour du focus à l'élément d'origine à la fermeture.
// Les calques marqués `data-modal-layer` ou `data-keep-active` restent actifs.
export function useModal<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { body, documentElement } = document;

    // Verrou du défilement (compense la barre de défilement pour éviter tout saut).
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    // Le reste de la page devient inerte (clavier + lecteurs d'écran).
    const inerted: Element[] = [];
    for (const element of [...body.children]) {
      if (
        element.hasAttribute("inert") ||
        element.hasAttribute("data-modal-layer") ||
        element.hasAttribute("data-keep-active") ||
        element.tagName.includes("-") ||
        element.tagName === "SCRIPT" ||
        (container && element.contains(container))
      ) continue;
      element.setAttribute("inert", "");
      inerted.push(element);
    }

    const focusFirst = () => {
      if (!container) return;
      const target = container.querySelector<HTMLElement>("[data-autofocus]") ?? focusableIn(container)[0] ?? container;
      target.focus({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const focusables = focusableIn(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      for (const element of inerted) element.removeAttribute("inert");
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open]);

  return containerRef;
}
