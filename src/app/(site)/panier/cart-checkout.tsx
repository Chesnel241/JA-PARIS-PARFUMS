"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Info, ShieldCheck, Truck, X } from "lucide-react";
import { useCart, type CartAdjustment, type CatalogSnapshot } from "@/lib/cart";
import { formatPrice } from "@/lib/data";
import { CartLine } from "@/components/commerce/cart-line";
import { CheckoutForm } from "./checkout-form";
import { OrderConfirmation } from "./order-confirmation";
import { OrderSummary } from "./order-summary";
import { clearDraft, loadLastOrder, saveLastOrder, type ConfirmedOrder } from "./checkout-utils";

type Step = "cart" | "checkout" | "confirmation";

const STEPS: { id: Step; label: string }[] = [
  { id: "cart", label: "Panier" },
  { id: "checkout", label: "Livraison" },
  { id: "confirmation", label: "Paiement" },
];

function describeAdjustment(adjustment: CartAdjustment) {
  const label = `${adjustment.name} (${adjustment.volume})`;
  switch (adjustment.type) {
    case "removed":
      return adjustment.reason === "out-of-stock"
        ? `${label} est désormais épuisé et a été retiré de votre panier.`
        : `${label} n’est plus disponible et a été retiré de votre panier.`;
    case "limited":
      return `Stock limité : la quantité de ${label} a été ramenée à ${adjustment.quantity}.`;
    case "price":
      return `Le prix de ${label} a été mis à jour : ${formatPrice(adjustment.price)} (au lieu de ${formatPrice(adjustment.previous)}).`;
  }
}

function setStepUrl(step: Step, mode: "push" | "replace" = "push") {
  const url = step === "cart" ? "/panier" : `/panier?etape=${step === "checkout" ? "livraison" : "confirmation"}`;
  try {
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  } catch {
    // ignore
  }
  window.scrollTo({ top: 0 });
}

export function CartCheckout({ catalog }: { catalog: CatalogSnapshot[] }) {
  const cart = useCart();
  const { items, hydrated, subtotal, shipping, grandTotal, reconcile, updateQuantity, removeItem, clearCart } = cart;
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [lastOrder, setLastOrder] = useState<ConfirmedOrder | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const noticesRef = useRef<HTMLDivElement>(null);

  const stepParam = searchParams.get("etape");
  const step: Step =
    stepParam === "confirmation" && lastOrder
      ? "confirmation"
      : stepParam === "livraison" && items.length > 0
        ? "checkout"
        : "cart";

  useEffect(() => {
    setLastOrder(loadLastOrder());
    setSessionLoaded(true);
  }, []);

  // Réconciliation avec le catalogue serveur (prix, stock, disponibilité).
  const lineSignature = items.map((item) => `${item.slug}|${item.volume}`).join(",");
  useEffect(() => {
    if (!hydrated) return;
    const adjustments = reconcile(catalog);
    if (adjustments.length === 0) return;
    setNotices((current) => [...new Set([...current, ...adjustments.map(describeAdjustment)])]);
  }, [hydrated, catalog, lineSignature, reconcile]);

  const goTo = useCallback((next: Step) => setStepUrl(next), []);

  const handleSuccess = useCallback((order: ConfirmedOrder) => {
    saveLastOrder(order);
    setLastOrder(order);
    clearDraft();
    clearCart();
    setNotices([]);
    setStepUrl("confirmation", "replace");
  }, [clearCart]);

  // 409 : le serveur a refusé pour stock insuffisant → on recharge le catalogue
  // (composant serveur) ; la réconciliation ajuste alors le panier.
  const handleStockConflict = useCallback(() => {
    router.refresh();
  }, [router]);

  const summaryLines = useMemo(
    () => items.map((item) => ({ key: `${item.slug}::${item.volume}`, name: item.name, volume: item.volume, quantity: item.quantity, price: item.price, image: item.image })),
    [items],
  );

  if (!hydrated || !sessionLoaded) {
    return (
      <div className="page-shell cm-cart-page" aria-busy="true">
        <div className="cm-skeleton">
          <span className="cm-skeleton__title" />
          <div className="cm-checkout">
            <div className="cm-skeleton__lines"><span /><span /></div>
            <span className="cm-skeleton__aside" />
          </div>
        </div>
        <p className="sr-only" role="status">Chargement du panier…</p>
      </div>
    );
  }

  if (step === "confirmation" && lastOrder) {
    return (
      <div className="page-shell cm-cart-page">
        <Stepper current="confirmation" />
        <OrderConfirmation order={lastOrder} />
      </div>
    );
  }

  const fade = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="page-shell cm-cart-page">
      {items.length > 0 ? <Stepper current={step} /> : null}

      <div ref={noticesRef} aria-live="polite">
        {notices.length > 0 ? (
          <div className="cm-notice" role="status">
            <Info aria-hidden="true" />
            <ul>{notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>
            <button type="button" className="cm-icon-button" onClick={() => setNotices([])} aria-label="Masquer ces informations">
              <X aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <motion.div className="cm-empty" {...fade}>
          <p className="eyebrow">Votre panier</p>
          <h1>Votre panier est <em>vide.</em></h1>
          <p>Laissez-vous guider par nos parfums et nos accessoires, pensés à Paris.</p>
          <div className="cm-empty__links">
            <Link className="primary-button" href="/boutique">Découvrir les parfums</Link>
            <Link className="cm-button-ghost" href="/accessoires">Les accessoires</Link>
          </div>
          {lastOrder ? (
            <div className="cm-empty__pending">
              <p>
                Commande <strong>{lastOrder.reference}</strong> · {formatPrice(lastOrder.total)} en attente de paiement.
              </p>
              <button type="button" className="cm-text-button" onClick={() => goTo("confirmation")}>
                Voir les instructions de paiement
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : step === "cart" ? (
        <motion.div key="cart" {...fade}>
          <header className="cm-cart-head">
            <h1>Votre panier</h1>
            <p>{cart.count} article{cart.count > 1 ? "s" : ""}</p>
          </header>
          <div className="cm-checkout">
            <ul className="cm-cart-lines" aria-label="Articles du panier">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={`${item.slug}::${item.volume}`}
                    layout={reduceMotion ? false : "position"}
                    exit={{ opacity: 0, transition: { duration: 0.18 } }}
                  >
                    <CartLine
                      item={item}
                      onQuantity={(quantity) => updateQuantity(item.slug, item.volume, quantity)}
                      onRemove={() => removeItem(item.slug, item.volume)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <aside className="cm-checkout__aside">
              <OrderSummary subtotal={subtotal} shipping={shipping} total={grandTotal}>
                <button type="button" className="primary-button cm-block-button" onClick={() => goTo("checkout")}>
                  Passer commande <ArrowRight aria-hidden="true" size={16} />
                </button>
                <ul className="cm-summary__assurances">
                  <li><ShieldCheck aria-hidden="true" /> Paiement sécurisé via Lydia</li>
                  <li><Truck aria-hidden="true" /> Expédition sous 2 à 3 jours</li>
                </ul>
              </OrderSummary>
              <Link className="cm-text-button cm-continue" href="/boutique">
                <ArrowLeft aria-hidden="true" size={15} /> Continuer mes achats
              </Link>
            </aside>
          </div>
        </motion.div>
      ) : (
        <motion.div key="checkout" {...fade}>
          <header className="cm-cart-head">
            <h1>Livraison</h1>
            <button type="button" className="cm-text-button" onClick={() => goTo("cart")}>
              <ArrowLeft aria-hidden="true" size={15} /> Modifier le panier
            </button>
          </header>
          <div className="cm-checkout cm-checkout--form">
            <div className="cm-checkout__form">
              <CheckoutForm items={items} total={grandTotal} onSuccess={handleSuccess} onStockConflict={handleStockConflict} />
            </div>
            <aside className="cm-checkout__aside">
              <OrderSummary showLines lines={summaryLines} subtotal={subtotal} shipping={shipping} total={grandTotal} />
            </aside>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <nav className="cm-stepper" aria-label="Étapes de la commande">
      <ol>
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className={index < currentIndex ? "is-done" : index === currentIndex ? "is-current" : ""}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className="cm-stepper__index" aria-hidden="true">{index + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
