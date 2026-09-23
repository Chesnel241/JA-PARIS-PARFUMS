"use client";

import { useEffect, useState } from "react";
import { m, useReducedMotion } from "@/components/motion";

// Vrai après le premier affichage : la transition ne joue qu'aux navigations
// côté client, jamais au chargement initial (pas de page masquée avant
// l'hydratation, aucun impact sur le LCP).
let hasNavigated = false;

export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => hasNavigated);
  const reduce = useReducedMotion();

  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <m.div
      className="page-transition"
      initial={animate && !reduce ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
