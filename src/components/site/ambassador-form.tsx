"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/maison/icons";

type FieldName = "firstName" | "lastName" | "email" | "phone" | "instagram" | "city" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName | "adult", string>>;

const EMPTY: Values = { firstName: "", lastName: "", email: "", phone: "", instagram: "", city: "", message: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

// Messages en français par champ (les messages bruts du serveur ne sont pas affichés).
const MESSAGES: Record<FieldName | "adult", string> = {
  firstName: "Indiquez votre prénom.",
  lastName: "Indiquez votre nom.",
  email: "Indiquez une adresse e-mail valide.",
  phone: "Numéro trop long (40 caractères maximum).",
  instagram: "Compte trop long (80 caractères maximum).",
  city: "Ville trop longue (80 caractères maximum).",
  message: `Votre message doit faire au moins ${MESSAGE_MIN} caractères.`,
  adult: "Cochez cette case pour continuer.",
};

const ORDER: (FieldName | "adult")[] = ["firstName", "lastName", "email", "phone", "instagram", "city", "message", "adult"];

function validate(values: Values, adult: boolean): Errors {
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
  if (!adult) errors.adult = MESSAGES.adult;
  return errors;
}

/** Candidature au Cercle JAE : POST /api/ambassador-applications, pot de miel. */
export function AmbassadorForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [sentName, setSentName] = useState("");

  const fieldId = (name: FieldName | "adult") => `${id}-${name}`;

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

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
    const next = validate(values, adult);
    setErrors(next);
    if (Object.keys(next).length > 0) {
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
        setSentName(payload.firstName);
        setStatus("success");
        setValues(EMPTY);
        setAdult(false);
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string; fields?: { fieldErrors?: Record<string, string[]> } };
      setStatus("idle");
      if (response.status === 422) {
        const serverErrors: Errors = {};
        for (const name of ORDER) if (name !== "adult" && data.fields?.fieldErrors?.[name]?.length) serverErrors[name] = MESSAGES[name];
        setErrors(serverErrors);
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
      <div className="cercle-form cercle-ok" role="status" aria-live="polite">
        <span className="tag"><span className="dot" />Candidature envoyée</span>
        <h2 className="h-md" ref={successRef} tabIndex={-1}>Merci {sentName}, bienvenue près du Cercle.</h2>
        <p className="muted">Nous étudions chaque profil avec attention et vous répondons par e-mail.</p>
        <div className="btn-row">
          <Link className="btn" href="/boutique">Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
          <button type="button" className="btn btn-line" onClick={() => setStatus("idle")}>Envoyer une autre candidature</button>
        </div>
      </div>
    );
  }

  const field = (name: FieldName, label: string, options: { type?: string; autoComplete?: string; required?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder?: string; maxLength?: number } = {}) => {
    const error = errors[name];
    const errorId = `${fieldId(name)}-error`;
    return (
      <div className={`field${error ? " invalid" : ""}`}>
        <label htmlFor={fieldId(name)}>{label}{options.required ? <span aria-hidden="true"> *</span> : null}</label>
        <input
          id={fieldId(name)}
          name={name}
          type={options.type ?? "text"}
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          placeholder={options.placeholder}
          maxLength={options.maxLength}
          required={options.required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={values[name]}
          onChange={(event) => update(name, event.target.value)}
        />
        {error ? <span id={errorId} className="err">{error}</span> : null}
      </div>
    );
  };

  const messageLength = values.message.trim().length;
  const messageError = errors.message;

  return (
    <form ref={formRef} className="cercle-form" onSubmit={onSubmit} noValidate aria-labelledby={`${id}-title`}>
      <h2 className="h-md" id={`${id}-title`}>Proposer ma candidature</h2>
      <p className="muted small">Les champs suivis d’un astérisque sont obligatoires.</p>
      <div className="form-grid">
        {field("firstName", "Prénom", { autoComplete: "given-name", required: true, maxLength: 60 })}
        {field("lastName", "Nom", { autoComplete: "family-name", required: true, maxLength: 60 })}
        {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email", required: true, maxLength: 160 })}
        {field("phone", "Téléphone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 40 })}
        {field("instagram", "Instagram ou TikTok", { placeholder: "@votrecompte", maxLength: 80 })}
        {field("city", "Ville", { autoComplete: "address-level2", maxLength: 80 })}
        <div className={`field full${messageError ? " invalid" : ""}`}>
          <label htmlFor={fieldId("message")}>Votre message<span aria-hidden="true"> *</span></label>
          <textarea
            id={fieldId("message")}
            name="message"
            rows={5}
            required
            maxLength={MESSAGE_MAX}
            placeholder="Parlez-nous de vous et de votre lien avec la maison."
            aria-invalid={messageError ? true : undefined}
            aria-describedby={`${fieldId("message")}-count${messageError ? ` ${fieldId("message")}-error` : ""}`}
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
          />
          <span className="count" id={`${fieldId("message")}-count`}>
            {messageLength < MESSAGE_MIN ? `Encore ${MESSAGE_MIN - messageLength} caractère${MESSAGE_MIN - messageLength > 1 ? "s" : ""} minimum` : `${messageLength} caractères`}
          </span>
          {messageError ? <span id={`${fieldId("message")}-error`} className="err">{messageError}</span> : null}
        </div>
      </div>
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir ce champ</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-end">
        <label className="check" htmlFor={fieldId("adult")}>
          <input
            type="checkbox"
            id={fieldId("adult")}
            checked={adult}
            aria-invalid={errors.adult ? true : undefined}
            aria-describedby={errors.adult ? `${fieldId("adult")}-error` : undefined}
            onChange={(event) => { setAdult(event.target.checked); if (errors.adult) setErrors((current) => ({ ...current, adult: undefined })); }}
          />
          <span>J’ai 18 ans ou plus, ou j’ai l’accord d’un parent pour candidater.</span>
        </label>
        {errors.adult ? <span className="form-err" id={`${fieldId("adult")}-error`}>{errors.adult}</span> : null}
        <div role="alert" aria-live="assertive">{formError ? <p className="form-err">{formError}</p> : null}</div>
        <button className="btn" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Envoi…" : "Envoyer ma candidature"}<span className="ico" aria-hidden="true"><ArrowIcon /></span>
        </button>
        <p className="form-note">Vos données servent uniquement à étudier votre candidature. <Link href="/confidentialite">Confidentialité</Link></p>
      </div>
    </form>
  );
}
