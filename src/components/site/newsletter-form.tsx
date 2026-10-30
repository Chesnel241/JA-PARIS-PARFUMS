"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "sending" | "success" | "error";

/** Inscription à la Lettre : POST /api/newsletter, pot de miel, états annoncés. */
export function NewsletterForm() {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);

  function fail(text: string, fieldInvalid = false) {
    setStatus("error");
    setMessage(text);
    setInvalid(fieldInvalid);
    if (fieldInvalid) inputRef.current?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) return fail("Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.", true);

    const website = (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    setStatus("sending");
    setMessage("");
    setInvalid(false);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, website }),
      });
      if (response.ok) {
        setStatus("success");
        setMessage("Merci, bienvenue dans la Lettre. Les nouvelles heures vous arriveront en premier.");
        setEmail("");
        return;
      }
      if (response.status === 422) return fail("Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.", true);
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      fail(data.error ?? "Inscription impossible pour le moment. Réessayez dans un instant.");
    } catch {
      fail("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    }
  }

  const messageId = `${id}-message`;

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor={`${id}-email`}>Votre e-mail</label>
      <div className="pill-form" data-invalid={invalid ? "" : undefined}>
        <input
          ref={inputRef}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Votre e-mail"
          maxLength={160}
          value={email}
          onChange={(event) => { setEmail(event.target.value); if (invalid) setInvalid(false); }}
          aria-invalid={invalid || undefined}
          aria-describedby={messageId}
          disabled={status === "sending"}
        />
        <button className="btn" type="submit" disabled={status === "sending"}>{status === "sending" ? "Envoi…" : "S’inscrire"}</button>
      </div>
      {/* Pot de miel : invisible et hors du parcours clavier. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir ce champ</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div id={messageId} role="status" aria-live="polite">
        {status === "success" ? <p className="form-ok">{message}</p> : status === "error" ? <p className="form-err">{message}</p> : null}
      </div>
      <p className="form-note">Vos données ne servent qu’à l’envoi de la lettre. Désinscription en un clic. <Link href="/confidentialite">Confidentialité</Link></p>
    </form>
  );
}

/** Carte « La Lettre JAE », commune à toutes les pages (sauf le tunnel de commande). */
export function LettreSlot() {
  const pathname = usePathname();
  if (pathname === "/panier") return null;
  return (
    <section className="wrap lettre" aria-labelledby="lettre-title">
      <div className="lettre-card">
        <div>
          <span className="tag">La Lettre JAE</span>
          <h2 className="h-lg" id="lettre-title">Les nouvelles heures, <span className="serif">avant tout le monde.</span></h2>
          <p className="muted">Nouveautés, retours en stock et avant-premières. Désinscription en un clic.</p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
