"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "sending" | "success" | "error";

/** Inscription newsletter : POST /api/newsletter, pot de miel, états annoncés. */
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
    if (!EMAIL_PATTERN.test(value)) return fail("Saisissez une adresse e-mail valide.", true);

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
        setMessage("Merci, votre inscription est confirmée.");
        setEmail("");
        return;
      }
      if (response.status === 422) return fail("Saisissez une adresse e-mail valide.", true);
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      fail(data.error ?? "Inscription impossible pour le moment. Réessayez dans un instant.");
    } catch {
      fail("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    }
  }

  const messageId = `${id}-message`;

  return (
    <form className="newsletter-form" onSubmit={onSubmit} noValidate>
      <label className="newsletter-label" htmlFor={`${id}-email`}>Adresse e-mail</label>
      <div className="newsletter-row">
        <input
          ref={inputRef}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(event) => { setEmail(event.target.value); if (invalid) setInvalid(false); }}
          aria-invalid={invalid || undefined}
          aria-describedby={messageId}
          disabled={status === "sending"}
        />
        <button className="primary-button light" type="submit" disabled={status === "sending"}>
          {status === "sending" ? <><LoaderCircle className="spin" aria-hidden /> Envoi…</> : <>S’inscrire <ArrowRight aria-hidden /></>}
        </button>
      </div>
      {/* Pot de miel : invisible et hors du parcours clavier. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir ce champ</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p id={messageId} className="newsletter-status" data-status={status} role="status" aria-live="polite">
        {status === "success" ? <Check aria-hidden size={16} /> : null}
        {message}
      </p>
      <p className="newsletter-legal">
        Désinscription en un clic. <Link href="/confidentialite">Confidentialité</Link>
      </p>
    </form>
  );
}
