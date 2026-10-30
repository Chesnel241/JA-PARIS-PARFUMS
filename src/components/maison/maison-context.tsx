"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildSchedule, GOLD, parisMinutes, slotAt, type Slot } from "@/lib/heures";
import type { MaisonItem } from "@/lib/maison";
import type { PaymentProvider } from "@/lib/payment";

type MaisonValue = {
  items: MaisonItem[];
  bySlug: Map<string, MaisonItem>;
  /** Parfums horodatés, triés par début de créneau. */
  schedule: Slot<MaisonItem>[];
  /** Minutes depuis minuit à Paris ; null tant que la page n'est pas montée. */
  now: number | null;
  toast: (message: string) => void;
  /** Moyen de paiement actif (carte via Stripe, ou Lydia en repli). */
  paymentProvider: PaymentProvider;
};

const MaisonContext = createContext<MaisonValue | null>(null);

const EMPTY: MaisonValue = { items: [], bySlug: new Map(), schedule: [], now: null, toast: () => {}, paymentProvider: "lydia" };

/**
 * Données de la maison pour l'habillage client (horloge de Paris, recherche,
 * panier, quiz). L'heure n'est lue qu'après montage : le rendu serveur reste
 * identique au premier rendu client (aucun écart d'hydratation).
 */
export function MaisonProvider({ items, paymentProvider = "lydia", children }: { items: MaisonItem[]; paymentProvider?: PaymentProvider; children: ReactNode }) {
  const [now, setNow] = useState<number | null>(null);
  const [toastState, setToastState] = useState({ id: 0, message: "", visible: false });
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const tick = () => setNow(parisMinutes());
    tick();
    const interval = window.setInterval(tick, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toast = useCallback((message: string) => {
    setToastState((previous) => ({ id: previous.id + 1, message, visible: true }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastState((previous) => ({ ...previous, visible: false })), 3400);
  }, []);

  const value = useMemo<MaisonValue>(() => {
    const schedule = buildSchedule(items.filter((item) => item.category === "PARFUM"));
    return { items, bySlug: new Map(items.map((item) => [item.slug, item])), schedule, now, toast, paymentProvider };
  }, [items, now, toast, paymentProvider]);

  return (
    <MaisonContext.Provider value={value}>
      {children}
      <div className={`toast${toastState.visible ? " on" : ""}`} role="status" aria-live="polite">
        <span key={toastState.id}>{toastState.message}</span>
      </div>
    </MaisonContext.Provider>
  );
}

export function useMaison(): MaisonValue {
  return useContext(MaisonContext) ?? EMPTY;
}

/** Le créneau en cours (ou à une heure donnée). */
export function useSlot(minutes?: number | null) {
  const { schedule, now } = useMaison();
  const at = minutes ?? now;
  return at === null || at === undefined ? null : slotAt(schedule, at);
}

/**
 * Couleur d'accent de la page (--acc sur <html>, transition CSS d'une seconde).
 * Revient à l'or de la maison quand le composant disparaît.
 */
export function useAccent(color: string | null | undefined) {
  useEffect(() => {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return;
    const root = document.documentElement;
    root.style.setProperty("--acc", color);
    return () => {
      root.style.setProperty("--acc", GOLD);
    };
  }, [color]);
}

export function Accent({ color }: { color: string | null | undefined }) {
  useAccent(color);
  return null;
}
