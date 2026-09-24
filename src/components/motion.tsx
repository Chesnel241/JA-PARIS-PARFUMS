"use client";

// Couche de mouvement du site.
// - Les apparitions au défilement (Reveal, Stagger) ne dépendent plus de
//   framer-motion : ce sont de simples attributs `data-animate` animés en CSS
//   et déclenchés par ScrollAnimator (src/components/experience). Rendu
//   identique côté serveur, zéro décalage de mise en page, respect de
//   prefers-reduced-motion, contenu visible sans JavaScript.
// - framer-motion (LazyMotion + composants `m`) reste utilisé pour les
//   micro-interactions d'interface (menu, tiroir, galerie, confirmations).
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion, type Transition } from "framer-motion";

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

type RevealTag = "div" | "section" | "header" | "li" | "article" | "p" | "figure";

/** Révélation au défilement (une seule fois) : fondu montant, ou simple fondu si y = 0. */
export function Reveal({ children, className, as: Tag = "div", delay = 0, y = 18, id }: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  delay?: number;
  y?: number;
  id?: string;
}) {
  return (
    <Tag id={id} className={className} data-animate={y === 0 ? "fade" : "fade-up"} style={{ "--d": delay } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Conteneur d'apparition échelonnée (grilles, listes) : chaque enfant apparaît à son tour. */
export function Stagger({ children, className, as: Tag = "div", gap = 0.08, label }: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul";
  gap?: number;
  label?: string;
}) {
  return (
    <Tag className={className} aria-label={label} data-stagger="" style={{ "--stagger": `${gap}s` } as CSSProperties}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  return <Tag className={className} data-animate="rise">{children}</Tag>;
}
