"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD, computeShipping } from "@/lib/shipping";

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [phone, setPhone] = useState("");

  async function handleCheckout(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((item) => ({
            slug: item.slug,
            name: item.name,
            image: item.image,
            volume: item.volume,
            price: item.price,
            quantity: item.quantity,
          })),
          deliveryAddress: {
            firstName,
            lastName,
            address,
            postalCode,
            city,
            country,
            phone: phone || undefined,
          },
        }),
      });

      const data = await response.json().catch(() => ({ error: "Erreur réseau." }));
      if (!response.ok) {
        setError(data.error ?? "Erreur lors de la commande.");
        setPending(false);
        return;
      }

      clearCart();
      setStep("success");
      // Redirection automatique vers Lydia après 2 secondes
      setTimeout(() => {
        window.location.href = "https://pay.lydia.me/l?t=jessicaa9zq1";
      }, 2000);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setPending(false);
    }
  }

  if (step === "success") {
    return (
      <div className="page-shell cart-page">
        <header className="page-intro compact">
          <p className="eyebrow">Confirmation</p>
          <h1>Votre commande est enregistrée.</h1>
        </header>
        <div className="empty-cart" style={{ border: 0 }}>
          <p style={{ fontSize: 18, color: "#5f8762" }}>Merci ! Votre commande a bien été créée.</p>
          <p style={{ fontSize: 13, color: "#6e665e", marginTop: 12 }}>Vous allez être redirigé vers le paiement sécurisé Lydia…</p>
          <Link className="primary-button" href="https://pay.lydia.me/l?t=jessicaa9zq1" target="_blank" rel="noopener noreferrer" style={{ marginTop: 24, color: "white" }}>
            Payer maintenant <ArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell cart-page">
      <header className="page-intro compact">
        <p className="eyebrow">Votre sélection</p>
        <h1>{step === "checkout" ? "Livraison." : "Le panier."}</h1>
      </header>

      {items.length === 0 && step === "cart" ? (
        <div className="empty-cart">
          <p>Votre panier attend encore son parfum.</p>
          <Link className="primary-button" href="/boutique">Découvrir la collection</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <article className="cart-item" key={`${item.slug}-${item.volume}`}>
                <div className="cart-image">
                  <Image src={item.image} alt={item.name} width={160} height={190} />
                </div>
                <div className="cart-item-copy">
                  <h2>{item.name}</h2>
                  <p>{item.volume}</p>
                  <div className="quantity">
                    <button aria-label="Retirer une unité" onClick={() => updateQuantity(item.slug, item.volume, item.quantity - 1)}>
                      <Minus />
                    </button>
                    <span>{item.quantity}</span>
                    <button aria-label="Ajouter une unité" onClick={() => updateQuantity(item.slug, item.volume, item.quantity + 1)}>
                      <Plus />
                    </button>
                  </div>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
                <button className="remove" aria-label={`Supprimer ${item.name}`} onClick={() => removeItem(item.slug, item.volume)}>
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="eyebrow">Récapitulatif</p>
            <div>
              <span>Sous-total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <div>
              <span>Livraison</span>
              <span>{computeShipping(total) === 0 ? "Offerte" : formatPrice(computeShipping(total))}</span>
            </div>
            {computeShipping(total) > 0 && (
              <small style={{ display: "block", padding: "4px 0", color: "#766e66", fontSize: 9 }}>
                Plus que {formatPrice(FREE_SHIPPING_THRESHOLD - total)} pour la livraison offerte.
              </small>
            )}
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatPrice(total + computeShipping(total))}</strong>
            </div>

            {step === "cart" ? (
              <button className="primary-button" onClick={() => setStep("checkout")} style={{ width: "100%", color: "white" }}>
                Continuer <ArrowRight />
              </button>
            ) : (
              <form onSubmit={handleCheckout} className="checkout-form">
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <div className="checkout-row">
                  <label className="field">
                    <span>Prénom</span>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Nom</span>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </label>
                </div>
                <label className="field">
                  <span>Adresse</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} required />
                </label>
                <div className="checkout-row">
                  <label className="field">
                    <span>Code postal</span>
                    <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Ville</span>
                    <input value={city} onChange={(e) => setCity(e.target.value)} required />
                  </label>
                </div>
                <div className="checkout-row">
                  <label className="field">
                    <span>Pays</span>
                    <input value={country} onChange={(e) => setCountry(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Téléphone</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                </div>
                {error && <p className="checkout-error">{error}</p>}
                <div className="checkout-actions">
                  <button type="button" className="primary-button ghost" onClick={() => setStep("cart")}>
                    Retour
                  </button>
                  <button className="primary-button" type="submit" disabled={pending} style={{ color: "white" }}>
                    {pending ? <><LoaderCircle className="spin" /> Commande…</> : <>Commander <ArrowRight /></>}
                  </button>
                </div>
                <small className="checkout-note">Paiement sécurisé via Lydia. Votre commande sera confirmée après réception du paiement.</small>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
