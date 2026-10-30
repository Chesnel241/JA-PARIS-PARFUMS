"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CartContextValue } from "@/lib/cart";
import { formatPrice } from "@/lib/data";
import { deName, formatMinutes } from "@/lib/heures";
import { CartLine } from "@/components/commerce/cart-line";
import { ShippingProgress } from "@/components/commerce/shipping-progress";
import { useModal } from "@/components/commerce/use-modal";
import { ArrowIcon, CloseIcon } from "@/components/maison/icons";
import { useMaison, useSlot } from "@/components/maison/maison-context";

const EASE = [0.2, 0.8, 0.2, 1] as const;

// Tiroir panier (slide-over) rendu par CartProvider. Ne s'affiche qu'après le
// chargement du panier côté client (aucun rendu serveur, aucun écart d'hydratation).
export function CartDrawer({ cart }: { cart: CartContextValue }) {
  const { isDrawerOpen, closeDrawer, hydrated } = cart;
  const panelRef = useModal<HTMLDivElement>(isDrawerOpen, closeDrawer);
  const reduceMotion = useReducedMotion();

  if (!hydrated) return null;

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.6, ease: EASE } };

  return createPortal(
    <div className="layer" data-modal-layer="">
      <AnimatePresence>
        {isDrawerOpen ? (
          <motion.div
            key="overlay"
            className="voile"
            aria-hidden="true"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.4 }}
          />
        ) : null}
        {isDrawerOpen ? (
          <motion.div
            key="panel"
            ref={panelRef}
            className="panier"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panier-title"
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

function EmptyDrawer({ onClose }: { onClose: () => void }) {
  const { now } = useMaison();
  const slot = useSlot();
  return (
    <div className="panier-vide">
      <p>Votre panier attend son heure.</p>
      {slot && now !== null ? (
        <>
          <p>Il est {formatMinutes(now)} à Paris, l’heure {deName(slot.item.name)}.</p>
          <Link className="btn" href={`/produit/${slot.item.slug}`} onClick={onClose}>Découvrir {slot.item.name}<span className="ico"><ArrowIcon /></span></Link>
        </>
      ) : (
        <Link className="btn" href="/boutique" onClick={onClose}>Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
      )}
      <Link className="lien-discret" href="/accessoires" onClick={onClose}>Voir Les Ors</Link>
    </div>
  );
}

function DrawerContent({ cart }: { cart: CartContextValue }) {
  const { items, count, subtotal, shipping, grandTotal, closeDrawer, updateQuantity, removeItem } = cart;
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="panier-head">
        <h2 id="panier-title">Votre panier{count > 0 ? <small> · {count} article{count > 1 ? "s" : ""}</small> : null}</h2>
        <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Fermer le panier" data-autofocus="">
          <CloseIcon />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyDrawer onClose={closeDrawer} />
      ) : (
        <>
          <div className="panier-ship">
            <ShippingProgress subtotal={subtotal} />
          </div>
          <ul className="panier-items" aria-label="Articles du panier">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={`${item.slug}::${item.volume}`}
                  layout={reduceMotion ? false : "position"}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.3, ease: EASE }}
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
          <div className="panier-foot">
            <dl className="cm-totals">
              <div><dt>Sous-total</dt><dd>{formatPrice(subtotal)}</dd></div>
              <div><dt>Livraison</dt><dd>{shipping === 0 ? "Offerte" : formatPrice(shipping)}</dd></div>
              <div className="cm-totals__grand"><dt>Total</dt><dd>{formatPrice(grandTotal)}</dd></div>
            </dl>
            <Link href="/panier" className="btn" onClick={closeDrawer}>Passer commande<span className="ico"><ArrowIcon /></span></Link>
            <p className="small">Paiement sécurisé via Lydia, après validation de la commande.</p>
          </div>
        </>
      )}
    </>
  );
}
