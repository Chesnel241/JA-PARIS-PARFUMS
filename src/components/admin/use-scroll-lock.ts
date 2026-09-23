"use client";

import { useEffect } from "react";

// Verrouille le défilement de la page tant qu'au moins une fenêtre modale
// (tiroir de navigation, confirmation, médiathèque…) est ouverte.
let locks = 0;
let previousOverflow = "";
let previousPaddingRight = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    if (locks === 0) {
      const scrollbar = window.innerWidth - root.clientWidth;
      previousOverflow = root.style.overflow;
      previousPaddingRight = root.style.paddingRight;
      root.style.overflow = "hidden";
      if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        root.style.overflow = previousOverflow;
        root.style.paddingRight = previousPaddingRight;
      }
    };
  }, [active]);
}
