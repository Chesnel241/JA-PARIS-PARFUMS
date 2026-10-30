"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { deName } from "@/lib/heures";
import { maxQuantityForStock } from "@/components/commerce/cart-rules";
import { safeImageSrc } from "@/components/commerce/media";
import { PlusIcon } from "@/components/maison/icons";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Bloc d'achat de la fiche : contenance (y compris épuisée), quantité, ajout
 * au panier ; pour une contenance épuisée, inscription « M'avertir du retour ».
 */
export function PurchaseBox({ product }: { product: Product }) {
  const { items, addItem, openDrawer, hydrated } = useCart();
  const variants = product.variants;
  const initial = Math.max(0, variants.findIndex((variant) => variant.stock > 0));
  const [selectedIndex, setSelectedIndex] = useState(initial);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "added" | "limited">("idle");
  const timer = useRef<number | undefined>(undefined);
  const groupName = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const selected = variants[selectedIndex] ?? variants[0];
  if (!selected) return null;
  const inStock = selected.stock > 0;
  const inCart = items.find((item) => item.slug === product.slug && item.volume === selected.volume)?.quantity ?? 0;
  const remaining = Math.max(0, maxQuantityForStock(selected.stock) - inCart);
  const effective = Math.max(1, Math.min(quantity, remaining || 1));
  const canAdd = inStock && remaining > 0;
  const isPerfume = product.category === "PARFUM";

  const select = (index: number) => {
    setSelectedIndex(index);
    setQuantity(1);
    setStatus("idle");
  };

  const add = () => {
    if (!canAdd) return;
    const result = addItem(
      { slug: product.slug, name: product.name, image: safeImageSrc(product.image), volume: selected.volume, price: selected.price, stock: selected.stock },
      effective,
    );
    window.clearTimeout(timer.current);
    if (result.added > 0) {
      setStatus("added");
      setQuantity(1);
      openDrawer();
      timer.current = window.setTimeout(() => setStatus("idle"), 2400);
    } else {
      setStatus("limited");
    }
  };

  const stockNote = selected.stock <= 3 ? `Plus que ${selected.stock} en stock · expédié sous 2 à 3 jours` : "En stock · expédié sous 2 à 3 jours";

  return (
    <>
      {variants.length > 1 ? (
        <fieldset className="sizes">
          <legend>{isPerfume ? "Contenance" : "Modèle"}</legend>
          {variants.map((variant, index) => {
            const id = `${groupName}-${index}`;
            const sold = variant.stock < 1;
            return (
              <div className="size" key={variant.volume}>
                <input type="radio" name={groupName} id={id} value={variant.volume} checked={index === selectedIndex} onChange={() => select(index)} />
                <label htmlFor={id}>
                  <span>{variant.volume}</span>
                  <span className={`st${sold ? " sold" : ""}`}>{formatPrice(variant.price)}{sold ? " · Épuisé" : ""}</span>
                </label>
              </div>
            );
          })}
        </fieldset>
      ) : null}

      <div className="p-buy">
        {inStock ? (
          <>
            <div className="p-price-row" aria-live="polite">
              <span className="price"><span className="sr-only">Prix : </span>{formatPrice(selected.price)}{variants.length === 1 && isPerfume ? <small>{selected.volume}</small> : null}</span>
              <span className="stat ok">{stockNote}</span>
            </div>
            <div className="buy-row">
              <div className="qty" role="group" aria-label={`Quantité de ${product.name}`}>
                <button type="button" aria-label="Retirer un" aria-disabled={effective <= 1} onClick={() => { if (effective > 1) { setQuantity(effective - 1); setStatus("idle"); } }}>−</button>
                <output aria-live="polite">{effective}</output>
                <button type="button" aria-label="Ajouter un" aria-disabled={effective >= remaining} onClick={() => { if (effective < remaining) { setQuantity(effective + 1); setStatus("idle"); } }}>+</button>
              </div>
              <button className="btn" type="button" onClick={add} disabled={!canAdd}>
                {status === "added" ? "Ajouté au panier" : hydrated && remaining === 0 ? "Maximum atteint dans le panier" : "Ajouter au panier"}
                <span className="ico" aria-hidden="true"><PlusIcon /></span>
              </button>
            </div>
            {status === "limited" ? <p className="buy-note is-alert" role="alert">Vous avez déjà la quantité maximale disponible dans votre panier.</p> : null}
          </>
        ) : (
          <>
            <div className="p-price-row">
              <span className="price"><span className="sr-only">Prix : </span>{formatPrice(selected.price)}</span>
              <span className="stat wait">Bientôt de retour</span>
            </div>
            <StockAlertForm slug={product.slug} name={product.name} volume={selected.volume} key={selected.volume} />
          </>
        )}
      </div>
    </>
  );
}

function StockAlertForm({ slug, name, volume }: { slug: string; name: string; volume: string }) {
  const id = useId();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Arrivée depuis « M'avertir du retour » (#alerte) : le champ est prêt à remplir.
  useEffect(() => {
    if (window.location.hash !== "#alerte") return;
    const input = inputRef.current;
    if (!input) return;
    input.scrollIntoView({ block: "center" });
    input.focus({ preventScroll: true });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value) || value.length > 160) {
      setError("Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.");
      inputRef.current?.focus();
      return;
    }
    const website = (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, slug, volume, website }),
      });
      if (response.ok) {
        setSent(value);
        setEmail("");
      } else if (response.status === 409) {
        // Revenu en stock entre-temps : on recharge la fiche.
        router.refresh();
      } else if (response.status === 422) {
        setError("Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.");
        inputRef.current?.focus();
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Votre demande n’a pas pu être enregistrée. Réessayez dans un instant.");
      }
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="waitlist" role="status">
        <p><strong>C’est noté.</strong> Nous écrirons à {sent} dès le retour {deName(name)} {volume}.</p>
      </div>
    );
  }

  return (
    <form className="waitlist" id="alerte" noValidate onSubmit={onSubmit}>
      <p><strong>{name} {volume} revient bientôt.</strong> Laissez votre e-mail, nous vous prévenons dès son retour.</p>
      <div className={`field${error ? " invalid" : ""}`}>
        <label htmlFor={`${id}-email`}>Votre e-mail</label>
        <input
          ref={inputRef}
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="prenom@exemple.fr"
          maxLength={160}
          value={email}
          onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error ? <span className="err" id={`${id}-error`} role="alert">{error}</span> : null}
      </div>
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir ce champ</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn" type="submit" disabled={sending}>{sending ? "Envoi…" : "M’avertir du retour"}</button>
      <p className="form-note">Votre adresse ne sert qu’à cette alerte.</p>
    </form>
  );
}
