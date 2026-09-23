"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Lock } from "lucide-react";
import { formatPrice } from "@/lib/data";
import type { CartItem } from "@/lib/cart";
import {
  COUNTRIES,
  EMPTY_FIELDS,
  FIELD_ORDER,
  buildOrderPayload,
  loadDraft,
  parseApiFieldErrors,
  saveDraft,
  toConfirmedOrder,
  validateAll,
  validateField,
  type CheckoutFields,
  type ConfirmedOrder,
  type FieldErrors,
  type FieldName,
} from "./checkout-utils";

type FieldConfig = {
  label: string;
  autoComplete: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  hint?: string;
  optional?: boolean;
  maxLength?: number;
};

const FIELD_CONFIG: Record<Exclude<FieldName, "country">, FieldConfig> = {
  email: { label: "E-mail", autoComplete: "email", type: "email", inputMode: "email", hint: "Pour vous envoyer la confirmation.", maxLength: 254 },
  phone: { label: "Téléphone", autoComplete: "tel", type: "tel", inputMode: "tel", optional: true, hint: "Pour le suivi du transporteur.", maxLength: 30 },
  firstName: { label: "Prénom", autoComplete: "given-name", maxLength: 100 },
  lastName: { label: "Nom", autoComplete: "family-name", maxLength: 100 },
  address: { label: "Adresse", autoComplete: "address-line1", hint: "Numéro et nom de rue.", maxLength: 200 },
  address2: { label: "Complément d’adresse", autoComplete: "address-line2", optional: true, hint: "Bâtiment, étage, digicode…", maxLength: 120 },
  postalCode: { label: "Code postal", autoComplete: "postal-code", maxLength: 12 },
  city: { label: "Ville", autoComplete: "address-level2", maxLength: 100 },
};

function parseRetryAfter(header: string | null): number {
  if (!header) return 60;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(3600, Math.ceil(seconds));
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(1, Math.min(3600, Math.ceil((date - Date.now()) / 1000))) : 60;
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export function CheckoutForm({
  items,
  total,
  onSuccess,
  onStockConflict,
}: {
  items: CartItem[];
  total: number;
  onSuccess: (order: ConfirmedOrder) => void;
  onStockConflict: () => void;
}) {
  // Monté uniquement côté client (après chargement du panier) : lecture directe du brouillon.
  const [fields, setFields] = useState<CheckoutFields>(() => loadDraft() ?? EMPTY_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const waitSeconds = retryUntil > now ? Math.ceil((retryUntil - now) / 1000) : 0;

  useEffect(() => {
    saveDraft(fields);
  }, [fields]);

  useEffect(() => {
    if (retryUntil <= Date.now()) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  const update = (name: FieldName, value: string) => {
    const next = { ...fields, [name]: value };
    setFields(next);
    setErrors((current) => {
      const updated = { ...current };
      const dependants: FieldName[] = name === "country" ? ["country", "postalCode", "phone"] : name === "address" || name === "address2" ? ["address", "address2"] : [name];
      for (const field of dependants) {
        if (touched[field] || current[field]) updated[field] = validateField(field, next);
      }
      return updated;
    });
  };

  const blur = (name: FieldName) => {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateField(name, fields) }));
  };

  const focusFirstError = (fieldErrors: FieldErrors) => {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const showFormError = (message: string) => {
    setFormError(message);
    window.requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || pending || waitSeconds > 0) return;

    const fieldErrors = validateAll(fields);
    setErrors(fieldErrors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((name) => [name, true])));
    if (Object.keys(fieldErrors).length > 0) {
      setFormError("Merci de vérifier les champs signalés.");
      focusFirstError(fieldErrors);
      return;
    }
    if (items.length === 0) {
      setFormError("Votre panier est vide.");
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setFormError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildOrderPayload(fields, items)),
        signal: controller.signal,
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      const apiMessage = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "";

      if (response.ok) {
        onSuccess(toConfirmedOrder(data, { fields, items }));
        return;
      }

      if (response.status === 422) {
        const apiErrors = parseApiFieldErrors((data as { fields?: unknown } | null)?.fields);
        setErrors((current) => ({ ...current, ...apiErrors }));
        showFormError(Object.keys(apiErrors).length > 0 ? "Merci de vérifier les champs signalés." : apiMessage || "Certaines informations sont invalides. Vérifiez le formulaire.");
        focusFirstError(apiErrors);
      } else if (response.status === 409) {
        onStockConflict();
        showFormError(
          `${apiMessage ? `${apiMessage}. ` : ""}Votre panier a été mis à jour avec le stock disponible : vérifiez-le puis validez à nouveau.`,
        );
      } else if (response.status === 429) {
        const wait = parseRetryAfter(response.headers.get("Retry-After"));
        setNow(Date.now());
        setRetryUntil(Date.now() + wait * 1000);
        showFormError(`Trop de tentatives en peu de temps. Réessayez dans ${formatWait(wait)}.`);
      } else {
        showFormError("Une erreur est survenue de notre côté. Votre panier est conservé : réessayez dans un instant.");
      }
    } catch {
      showFormError("Connexion impossible. Vérifiez votre réseau puis réessayez : votre panier est conservé.");
    } finally {
      window.clearTimeout(timeout);
      submittingRef.current = false;
      setPending(false);
    }
  }

  const renderField = (name: Exclude<FieldName, "country">, extra?: Partial<FieldConfig>) => {
    const config = { ...FIELD_CONFIG[name], ...extra };
    const error = errors[name];
    const describedBy = [error ? `cm-${name}-error` : "", config.hint ? `cm-${name}-hint` : ""].filter(Boolean).join(" ");
    return (
      <div className={`cm-field${error ? " has-error" : ""}`}>
        <label htmlFor={`cm-${name}`}>
          {config.label}
          {config.optional ? <span className="cm-field__optional"> (facultatif)</span> : null}
        </label>
        <input
          id={`cm-${name}`}
          name={name}
          type={config.type ?? "text"}
          inputMode={config.inputMode}
          autoComplete={config.autoComplete}
          autoCapitalize={name === "email" ? "none" : undefined}
          spellCheck={name === "email" ? false : undefined}
          maxLength={config.maxLength}
          required={!config.optional}
          aria-required={!config.optional}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          value={fields[name]}
          onChange={(event) => update(name, event.target.value)}
          onBlur={() => blur(name)}
        />
        {error ? (
          <p className="cm-field__error" id={`cm-${name}-error`}>
            <CircleAlert aria-hidden="true" /> {error}
          </p>
        ) : config.hint ? (
          <p className="cm-field__hint" id={`cm-${name}-hint`}>{config.hint}</p>
        ) : null}
      </div>
    );
  };

  const franceLike = ["france", "monaco"].includes(fields.country.trim().toLowerCase());
  const countryError = errors.country;

  return (
    <form ref={formRef} className="cm-form" onSubmit={handleSubmit} noValidate aria-describedby="cm-form-legal">
      <fieldset className="cm-form__group">
        <legend>Contact</legend>
        {renderField("email")}
        {renderField("phone")}
      </fieldset>

      <fieldset className="cm-form__group">
        <legend>Adresse de livraison</legend>
        <div className="cm-form__row">
          {renderField("firstName")}
          {renderField("lastName")}
        </div>
        {renderField("address")}
        {renderField("address2")}
        <div className="cm-form__row cm-form__row--postal">
          {renderField("postalCode", { inputMode: franceLike ? "numeric" : "text", maxLength: franceLike ? 6 : 12 })}
          {renderField("city")}
        </div>
        <div className={`cm-field${countryError ? " has-error" : ""}`}>
          <label htmlFor="cm-country">Pays</label>
          <div className="cm-select">
            <select
              id="cm-country"
              name="country"
              autoComplete="country-name"
              value={fields.country}
              aria-invalid={countryError ? true : undefined}
              aria-describedby={countryError ? "cm-country-error" : undefined}
              onChange={(event) => update("country", event.target.value)}
              onBlur={() => blur("country")}
            >
              {(COUNTRIES.includes(fields.country) ? COUNTRIES : [fields.country, ...COUNTRIES]).filter(Boolean).map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          {countryError ? <p className="cm-field__error" id="cm-country-error"><CircleAlert aria-hidden="true" /> {countryError}</p> : null}
        </div>
      </fieldset>

      <div className="cm-form__payment">
        <Lock aria-hidden="true" />
        <p>
          <strong>Paiement via Lydia</strong>
          Après validation, vous recevez une référence de commande à indiquer lors du paiement Lydia. Votre commande est réservée dès maintenant.
        </p>
      </div>

      <div ref={alertRef} className="cm-form__alert-slot" aria-live="assertive">
        {formError ? (
          <div className="cm-alert" role="alert">
            <CircleAlert aria-hidden="true" />
            <p>{formError}</p>
          </div>
        ) : null}
      </div>

      <button type="submit" className="primary-button cm-block-button cm-submit" disabled={pending || waitSeconds > 0} aria-busy={pending}>
        {pending ? (
          <><LoaderCircle className="spin" aria-hidden="true" size={18} /> Validation en cours…</>
        ) : waitSeconds > 0 ? (
          <>Réessayer dans {formatWait(waitSeconds)}</>
        ) : (
          <>Valider la commande · {formatPrice(total)} <ArrowRight aria-hidden="true" size={16} /></>
        )}
      </button>
      <p className="cm-form__legal" id="cm-form-legal">
        En validant, vous confirmez votre commande. Le montant final est recalculé par nos soins au prix en vigueur.
      </p>
    </form>
  );
}
