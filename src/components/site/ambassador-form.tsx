"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";

type FieldName = "firstName" | "lastName" | "email" | "phone" | "instagram" | "city" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = { firstName: "", lastName: "", email: "", phone: "", instagram: "", city: "", message: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

// Messages en français par champ (les messages bruts du serveur ne sont pas affichés).
const MESSAGES: Record<FieldName, string> = {
  firstName: "Indiquez votre prénom.",
  lastName: "Indiquez votre nom.",
  email: "Saisissez une adresse e-mail valide.",
  phone: "Numéro trop long (40 caractères maximum).",
  instagram: "Compte Instagram trop long (80 caractères maximum).",
  city: "Ville trop longue (80 caractères maximum).",
  message: `Présentez-vous en ${MESSAGE_MIN} caractères minimum.`,
};

const ORDER: FieldName[] = ["firstName", "lastName", "email", "phone", "instagram", "city", "message"];

function validate(values: Values): Errors {
  const errors: Errors = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const message = values.message.trim();
  if (!firstName || firstName.length > 60) errors.firstName = MESSAGES.firstName;
  if (!lastName || lastName.length > 60) errors.lastName = MESSAGES.lastName;
  if (!EMAIL_PATTERN.test(values.email.trim()) || values.email.trim().length > 160) errors.email = MESSAGES.email;
  if (values.phone.trim().length > 40) errors.phone = MESSAGES.phone;
  if (values.instagram.trim().length > 80) errors.instagram = MESSAGES.instagram;
  if (values.city.trim().length > 80) errors.city = MESSAGES.city;
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) errors.message = message.length > MESSAGE_MAX ? `${MESSAGE_MAX} caractères maximum.` : MESSAGES.message;
  return errors;
}

export function AmbassadorForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");

  const fieldId = (name: FieldName) => `${id}-${name}`;

  function focusFirstError(next: Errors) {
    const first = ORDER.find((name) => next[name]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fieldId(first))}`)?.focus();
  }

  function update(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setFormError("");
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("Merci de corriger les champs indiqués.");
      focusFirstError(next);
      return;
    }

    const website = (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      instagram: values.instagram.trim() || undefined,
      city: values.city.trim() || undefined,
      message: values.message.trim(),
      website,
    };

    setStatus("sending");
    try {
      const response = await fetch("/api/ambassador-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setStatus("success");
        setValues(EMPTY);
        window.setTimeout(() => successRef.current?.focus(), 50);
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string; fields?: { fieldErrors?: Record<string, string[]> } };
      setStatus("idle");
      if (response.status === 422) {
        const serverErrors: Errors = {};
        for (const name of ORDER) if (data.fields?.fieldErrors?.[name]?.length) serverErrors[name] = MESSAGES[name];
        setErrors(serverErrors);
        setFormError("Merci de corriger les champs indiqués.");
        focusFirstError(serverErrors);
        return;
      }
      setFormError(data.error ?? "Votre candidature n’a pas pu être envoyée. Réessayez dans un instant.");
    } catch {
      setStatus("idle");
      setFormError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span className="form-success-icon" aria-hidden><Check size={22} /></span>
        <h3 ref={successRef} tabIndex={-1}>Merci, votre candidature est envoyée.</h3>
        <p>Nous revenons vers vous par e-mail très prochainement.</p>
        <button type="button" className="text-link" onClick={() => setStatus("idle")}>Envoyer une autre candidature</button>
      </div>
    );
  }

  const field = (name: FieldName, label: string, options: { type?: string; autoComplete?: string; required?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder?: string; wide?: boolean } = {}) => {
    const error = errors[name];
    const errorId = `${fieldId(name)}-error`;
    return (
      <div className={`form-field${options.wide ? " is-wide" : ""}`} data-invalid={error ? "" : undefined}>
        <label htmlFor={fieldId(name)}>
          {label}
          {options.required ? <span aria-hidden> *</span> : <span className="form-optional"> (facultatif)</span>}
        </label>
        <input
          id={fieldId(name)}
          name={name}
          type={options.type ?? "text"}
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          placeholder={options.placeholder}
          required={options.required}
          aria-required={options.required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={values[name]}
          onChange={(event) => update(name, event.target.value)}
        />
        {error ? <p id={errorId} className="form-error">{error}</p> : null}
      </div>
    );
  };

  const messageLength = values.message.trim().length;
  const messageError = errors.message;

  return (
    <form ref={formRef} className="ambassador-form" onSubmit={onSubmit} noValidate aria-describedby={`${id}-required`}>
      <p id={`${id}-required`} className="form-hint">Les champs marqués d’un * sont obligatoires.</p>
      <div className="form-grid">
        {field("firstName", "Prénom", { autoComplete: "given-name", required: true })}
        {field("lastName", "Nom", { autoComplete: "family-name", required: true })}
        {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email", required: true })}
        {field("phone", "Téléphone", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
        {field("instagram", "Instagram", { placeholder: "@votrecompte" })}
        {field("city", "Ville", { autoComplete: "address-level2" })}
        <div className="form-field is-wide" data-invalid={messageError ? "" : undefined}>
          <label htmlFor={fieldId("message")}>Votre message<span aria-hidden> *</span></label>
          <textarea
            id={fieldId("message")}
            name="message"
            rows={5}
            required
            aria-required
            maxLength={MESSAGE_MAX}
            aria-invalid={messageError ? true : undefined}
            aria-describedby={`${fieldId("message")}-help${messageError ? ` ${fieldId("message")}-error` : ""}`}
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
          />
          <p id={`${fieldId("message")}-help`} className="form-help">
            Parlez-nous de vous et de votre lien avec la maison. <span className="form-counter">{messageLength < MESSAGE_MIN ? `${MESSAGE_MIN - messageLength} caractère${MESSAGE_MIN - messageLength > 1 ? "s" : ""} minimum restant${MESSAGE_MIN - messageLength > 1 ? "s" : ""}` : `${messageLength} / ${MESSAGE_MAX}`}</span>
          </p>
          {messageError ? <p id={`${fieldId("message")}-error`} className="form-error">{messageError}</p> : null}
        </div>
      </div>
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir ce champ</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-status" role="alert" aria-live="assertive">{formError ? <p className="form-alert">{formError}</p> : null}</div>
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={status === "sending"}>
          {status === "sending" ? <><LoaderCircle className="spin" aria-hidden /> Envoi…</> : <>Envoyer ma candidature <ArrowRight aria-hidden /></>}
        </button>
        <p className="form-legal">Vos données servent uniquement à étudier votre candidature. <Link href="/confidentialite">Confidentialité</Link></p>
      </div>
    </form>
  );
}
