"use client";

// Couche de mouvement du site. Tout passe par LazyMotion + domAnimation et les
// composants `m` (bundle réduit), sous MotionConfig reducedMotion="user".
// Principes : animations d'opacité / transform uniquement (aucun décalage de
// mise en page), jamais bloquantes, désactivées si prefers-reduced-motion.
import type { ReactNode } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion, type Transition, type Variants } from "framer-motion";

export { AnimatePresence, m, useReducedMotion };
// Alias rétrocompatible : `motion.div` depuis ce module reste léger (m.div).
export { m as motion };

export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const viewport = { once: true, margin: "0px 0px -8% 0px" } as const;

type RevealTag = "div" | "section" | "header" | "li" | "article" | "p" | "figure";

function tagFor(as: RevealTag) {
  switch (as) {
    case "section": return m.section;
    case "header": return m.header;
    case "li": return m.li;
    case "article": return m.article;
    case "p": return m.p;
    case "figure": return m.figure;
    default: return m.div;
  }
}

/** Révélation sobre au scroll (une seule fois). */
export function Reveal({ children, className, as = "div", delay = 0, y = 18, id }: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  delay?: number;
  y?: number;
  id?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = tagFor(as);
  return (
    <Tag
      id={id}
      className={className}
      data-reveal=""
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}

/** Conteneur d'apparition échelonnée (grilles, listes). */
export function Stagger({ children, className, as = "div", gap = 0.08, label }: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul";
  gap?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : gap } } };
  const Tag = as === "ul" ? m.ul : m.div;
  return (
    <Tag className={className} aria-label={label} initial="hidden" whileInView="show" viewport={viewport} variants={variants}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { duration: 0.7, ease: EASE_OUT } },
  };
  const Tag = as === "li" ? m.li : m.div;
  return <Tag className={className} data-reveal="" variants={variants}>{children}</Tag>;
}
