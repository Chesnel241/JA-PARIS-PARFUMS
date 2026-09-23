"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import type { CartContextValue } from "@/lib/cart";
import { formatPrice } from "@/lib/data";
import { CartLine } from "@/components/commerce/cart-line";
import { ShippingProgress } from "@/components/commerce/shipping-progress";
import { useModal } from "@/components/commerce/use-modal";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Tiroir panier (slide-over) rendu par CartProvider. Ne s'affiche qu'après le
// chargement du panier côté client (aucun rendu serveur, aucun écart d'hydratation).
export function CartDrawer({ cart }: { cart: CartContextValue }) {
  const { isDrawerOpen, closeDrawer, hydrated } = cart;
  const panelRef = useModal<HTMLDivElement>(isDrawerOpen, closeDrawer);
  const reduceMotion = useReducedMotion();

  if (!hydrated) return null;

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
        transition: { duration: 0.5, ease: EASE_OUT },
      };

  return createPortal(
    <div className="cm-drawer-layer" data-modal-layer="">
      <AnimatePresence>
        {isDrawerOpen ? (
          <motion.div
            key="overlay"
            className="cm-overlay"
            aria-hidden="true"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.35 }}
          />
        ) : null}
        {isDrawerOpen ? (
          <motion.div
            key="panel"
            ref={panelRef}
            className="cm-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-drawer-title"
            tabIndex={-1}
            {...panelMotion}
          >
            <DrawerContent cart={cart} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function DrawerContent({ cart }: { cart: CartContextValue }) {
  const { items, count, subtotal, shipping, grandTotal, closeDrawer, updateQuantity, removeItem } = cart;
  const reduceMotion = useReducedMotion();

  return (
    <>
      <header className="cm-drawer__head">
        <h2 id="cm-drawer-title">
          Votre panier{count > 0 ? <span className="cm-drawer__count"> ({count})</span> : null}
        </h2>
        <button type="button" className="cm-icon-button" onClick={closeDrawer} aria-label="Fermer le panier" data-autofocus="">
          <X aria-hidden="true" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="cm-drawer__empty">
          <ShoppingBag aria-hidden="true" strokeWidth={1.2} />
          <p className="cm-drawer__empty-title">Votre panier est vide.</p>
          <p>Laissez-vous guider par nos créations.</p>
          <div className="cm-drawer__empty-links">
            <Link className="primary-button" href="/boutique" onClick={closeDrawer}>Les parfums</Link>
            <Link className="cm-button-ghost" href="/accessoires" onClick={closeDrawer}>Les accessoires</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="cm-drawer__ship">
            <ShippingProgress subtotal={subtotal} />
          </div>
          <ul className="cm-drawer__lines" aria-label="Articles du panier">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={`${item.slug}::${item.volume}`}
                  layout={reduceMotion ? false : "position"}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <CartLine
                    item={item}
                    size="sm"
                    onNavigate={closeDrawer}
                    onQuantity={(quantity) => updateQuantity(item.slug, item.volume, quantity)}
                    onRemove={() => removeItem(item.slug, item.volume)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <footer className="cm-drawer__foot">
            <dl className="cm-totals">
              <div>
                <dt>Sous-total</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>Livraison</dt>
                <dd>{shipping === 0 ? "Offerte" : formatPrice(shipping)}</dd>
              </div>
              <div className="cm-totals__grand">
                <dt>Total</dt>
                <dd>{formatPrice(grandTotal)}</dd>
              </div>
            </dl>
            <Link href="/panier" className="primary-button cm-block-button" onClick={closeDrawer}>
              Commander <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <button type="button" className="cm-text-button" onClick={closeDrawer}>
              Continuer mes achats
            </button>
          </footer>
        </>
      )}
    </>
  );
}
