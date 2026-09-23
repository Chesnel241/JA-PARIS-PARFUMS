"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { maxQuantityForStock } from "@/components/commerce/cart-rules";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";
import { QuantityStepper } from "@/components/commerce/quantity-stepper";
import { PURCHASE_END_ID } from "@/components/commerce/constants";

type Variant = Product["variants"][number];

export function AddToCart({ product }: { product: Product }) {
  const { items, addItem, openDrawer, hydrated } = useCart();
  const reduceMotion = useReducedMotion();
  const variants = product.variants;
  const initial = variants.find((variant) => variant.stock > 0) ?? variants[0];
  const [volume, setVolume] = useState(initial?.volume ?? "");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "added" | "limited">("idle");
  const [showBar, setShowBar] = useState(false);
  // Animation du prix seulement après un changement de contenance (jamais au
  // premier rendu : rendu serveur et client identiques).
  const [variantChanged, setVariantChanged] = useState(false);
  const buyRowRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const selected: Variant | undefined = variants.find((variant) => variant.volume === volume) ?? initial;
  const soldOut = !selected || selected.stock < 1;
  const allSoldOut = variants.every((variant) => variant.stock < 1);
  const inCart = selected ? items.find((item) => item.slug === product.slug && item.volume === selected.volume)?.quantity ?? 0 : 0;
  const remaining = selected ? Math.max(0, maxQuantityForStock(selected.stock) - inCart) : 0;
  const effectiveQuantity = Math.max(1, Math.min(quantity, remaining || 1));
  const canAdd = !soldOut && remaining > 0;

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Barre d'achat collante : visible une fois le bloc d'achat dépassé, masquée
  // en fin de page.
  useEffect(() => {
    const row = buyRowRef.current;
    const end = document.getElementById(PURCHASE_END_ID);
    if (!row || typeof IntersectionObserver === "undefined") return;
    let pastRow = false;
    let atEnd = false;
    const update = () => setShowBar(pastRow && !atEnd);
    const rowObserver = new IntersectionObserver(([entry]) => {
      pastRow = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    const endObserver = new IntersectionObserver(([entry]) => {
      atEnd = entry.isIntersecting || entry.boundingClientRect.top < 0;
      update();
    });
    rowObserver.observe(row);
    if (end) endObserver.observe(end);
    return () => {
      rowObserver.disconnect();
      endObserver.disconnect();
    };
  }, []);

  const selectVariant = (next: string) => {
    setVolume(next);
    setVariantChanged(true);
    setQuantity(1);
    setStatus("idle");
  };

  const handleAdd = () => {
    if (!selected || !canAdd) return;
    const result = addItem(
      { slug: product.slug, name: product.name, image: safeImageSrc(product.image), volume: selected.volume, price: selected.price, stock: selected.stock },
      effectiveQuantity,
    );
    window.clearTimeout(timerRef.current);
    if (result.added > 0) {
      setStatus("added");
      setQuantity(1);
      openDrawer();
      timerRef.current = window.setTimeout(() => setStatus("idle"), 2400);
    } else {
      setStatus("limited");
    }
  };

  const buttonLabel = allSoldOut
    ? "Épuisé"
    : soldOut
      ? "Contenance épuisée"
      : hydrated && remaining === 0
        ? "Maximum atteint dans le panier"
        : "Ajouter au panier";

  const stockNote = soldOut
    ? allSoldOut
      ? "Cette création est momentanément épuisée."
      : "Cette contenance est épuisée. Choisissez une autre contenance."
    : (selected?.stock ?? 0) <= 5
      ? `Plus que ${selected?.stock ?? 0} en stock · expédition sous 2 à 3 jours`
      : "En stock · expédition sous 2 à 3 jours";

  const thumb = safeImageSrc(product.image);

  return (
    <div className="cm-purchase">
      <p className="cm-purchase__price" aria-live="polite">
        <span className="sr-only">Prix : </span>
        <motion.span
          className="cm-purchase__amount"
          key={selected ? `${selected.volume}-${selected.price}` : "none"}
          initial={variantChanged && !reduceMotion ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {selected ? formatPrice(selected.price) : "—"}
        </motion.span>
        {selected ? <span className="cm-purchase__volume">{selected.volume}</span> : null}
      </p>

      {variants.length > 1 ? (
        <fieldset className="cm-variants">
          <legend>Contenance</legend>
          <div className="cm-variants__grid">
            {variants.map((variant) => {
              const out = variant.stock < 1;
              const checked = variant.volume === selected?.volume;
              return (
                <label key={variant.volume} className={`cm-variant${checked ? " is-selected" : ""}${out ? " is-out" : ""}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name={`variant-${product.slug}`}
                    value={variant.volume}
                    checked={checked}
                    disabled={out}
                    onChange={() => selectVariant(variant.volume)}
                  />
                  <span className="cm-variant__volume">{variant.volume}</span>
                  <span className="cm-variant__price">{out ? "Épuisé" : formatPrice(variant.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : selected ? (
        <p className="cm-variant-single"><span>Format</span>{selected.volume}</p>
      ) : null}

      <div className="cm-buy-row" ref={buyRowRef}>
        {!soldOut ? (
          <QuantityStepper
            value={effectiveQuantity}
            max={Math.max(1, remaining)}
            onChange={(next) => {
              setQuantity(next);
              setStatus("idle");
            }}
            label={`Quantité de ${product.name}`}
          />
        ) : null}
        <button type="button" className={`primary-button cm-add${status === "added" ? " is-added" : ""}`} onClick={handleAdd} disabled={!canAdd}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status === "added" ? "added" : buttonLabel}
              className="cm-add__label"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {status === "added" ? <><Check aria-hidden="true" size={17} /> Ajouté au panier</> : buttonLabel}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <p className={`cm-purchase__note${soldOut ? " is-alert" : ""}`} role={status === "limited" ? "alert" : undefined}>
        {status === "limited"
          ? "Vous avez déjà la quantité maximale disponible dans votre panier."
          : stockNote}
      </p>

      {hydrated
        ? createPortal(
            <AnimatePresence>
              {showBar ? (
                <motion.div
                  key="sticky-bar"
                  className="cm-sticky-buy"
                  initial={reduceMotion ? { opacity: 0 } : { y: "110%" }}
                  animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { y: "110%" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="cm-sticky-buy__media" aria-hidden="true">
                    <Image src={thumb} alt="" fill sizes="48px" unoptimized={isUnoptimizedImage(thumb)} className={isVectorImage(thumb) ? "is-contained" : "is-cover"} />
                  </div>
                  <div className="cm-sticky-buy__copy">
                    <p className="cm-sticky-buy__name">{product.name}</p>
                    <p className="cm-sticky-buy__meta">
                      {selected ? `${selected.volume} · ${formatPrice(selected.price)}` : ""}
                    </p>
                  </div>
                  <button type="button" className="primary-button cm-sticky-buy__button" onClick={handleAdd} disabled={!canAdd}>
                    {status === "added" ? <><Check aria-hidden="true" size={16} /> Ajouté</> : soldOut ? "Épuisé" : remaining === 0 ? "Maximum" : "Ajouter"}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
