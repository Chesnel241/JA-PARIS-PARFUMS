"use client";

import { useEffect, useRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { useConfirm } from "@/components/admin/confirm";

type FieldChrome = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  required?: boolean;
  counter?: { value: string; max: number };
};

export function describedBy(id: string, hint?: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return ids || undefined;
}

export function Field({ id, label, hint, error, optional, required, counter, children }: FieldChrome & { children: ReactNode }) {
  const over = counter ? counter.value.length > counter.max : false;
  return (
    <div className="adm-field">
      <div className="adm-label-row">
        <label className="adm-label" htmlFor={id}>
          {label}
          {optional && <span className="adm-optional">(facultatif)</span>}
          {required && <span className="adm-required" aria-hidden>*</span>}
        </label>
        {counter && <span className="adm-counter" data-state={over ? "over" : undefined}>{counter.value.length} / {counter.max}</span>}
      </div>
      {children}
      {hint && <p className="adm-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="adm-error" id={`${id}-error`}><CircleAlert aria-hidden />{error}</p>}
    </div>
  );
}

type TextFieldProps = FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "prefix"> & {
  value: string;
  onChange: (value: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  showCount?: boolean;
};

export function TextField({ id, label, hint, error, optional, required, value, onChange, prefix, suffix, showCount, maxLength, ...rest }: TextFieldProps) {
  const input = (
    <input
      {...rest}
      id={id}
      className="adm-input"
      value={value}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      aria-describedby={describedBy(id, hint, error)}
    />
  );
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} required={required} counter={showCount && maxLength ? { value, max: maxLength } : undefined}>
      {prefix || suffix ? (
        <div className="adm-input-group" data-invalid={error ? "true" : undefined}>
          {prefix && <span className="adm-input-affix" aria-hidden>{prefix}</span>}
          {input}
          {suffix && <span className="adm-input-affix" aria-hidden>{suffix}</span>}
        </div>
      ) : input}
    </Field>
  );
}

type TextAreaFieldProps = FieldChrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  showCount?: boolean;
};

export function TextAreaField({ id, label, hint, error, optional, required, value, onChange, showCount, maxLength, ...rest }: TextAreaFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} required={required} counter={showCount && maxLength ? { value, max: maxLength } : undefined}>
      <textarea
        {...rest}
        id={id}
        className="adm-input"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </Field>
  );
}

type SelectFieldProps = FieldChrome & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export function SelectField({ id, label, hint, error, optional, required, value, onChange, options, ...rest }: SelectFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} required={required}>
      <select
        {...rest}
        id={id}
        className="adm-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

export function Switch({ id, checked, onChange, label, description, disabled }: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="adm-switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-describedby={description ? `${id}-desc` : undefined} />
      <span className="adm-switch-text">
        <strong>{label}</strong>
        {description && <span id={`${id}-desc`}>{description}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({ pending, children, pendingLabel = "Enregistrement…", disabled, className = "adm-btn adm-btn--primary", form }: {
  pending: boolean;
  children: ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
  form?: string;
}) {
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending || undefined} form={form}>
      {pending ? <><LoaderCircle className="adm-spin" aria-hidden /> {pendingLabel}</> : children}
    </button>
  );
}

// Barre d'enregistrement collante en bas du formulaire (façon Shopify).
export function SaveBar({ dirty, pending, isNew, submitLabel, onDiscard }: {
  dirty: boolean;
  pending: boolean;
  isNew?: boolean;
  submitLabel?: string;
  onDiscard?: () => void;
}) {
  const state = isNew ? "new" : dirty ? "dirty" : "clean";
  return (
    <div className="adm-savebar" role="region" aria-label="Enregistrement">
      <p className="adm-savebar-status" data-state={state} aria-live="polite">
        {state === "clean" ? <CircleCheck aria-hidden /> : <TriangleAlert aria-hidden />}
        {state === "new" ? "Nouvel élément non enregistré" : state === "dirty" ? "Modifications non enregistrées" : "Tout est enregistré"}
      </p>
      <div className="adm-savebar-actions">
        {onDiscard && dirty && !isNew && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDiscard} disabled={pending}>Annuler les modifications</button>
        )}
        <SubmitButton pending={pending} disabled={!isNew && !dirty}>{submitLabel ?? (isNew ? "Créer" : "Enregistrer")}</SubmitButton>
      </div>
    </div>
  );
}

// Place le focus sur le premier champ invalide (après le rendu des erreurs).
export function focusFirstInvalid(form: HTMLFormElement | null) {
  if (!form) return;
  window.requestAnimationFrame(() => {
    const target = form.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"] input');
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

// Prévient la perte de saisie : fermeture/rechargement de l'onglet
// (beforeunload) et navigation interne par lien (confirmation personnalisée).
export function useUnsavedChanges(dirty: boolean) {
  const confirm = useConfirm();
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.dataset.skipUnsaved !== undefined) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: "Quitter sans enregistrer ?",
        description: "Vos modifications seront perdues si vous quittez cette page.",
        confirmLabel: "Quitter la page",
        cancelLabel: "Rester",
        tone: "danger",
      }).then((leave) => {
        if (leave) {
          dirtyRef.current = false;
          router.push(`${url.pathname}${url.search}${url.hash}`);
        }
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);
}
