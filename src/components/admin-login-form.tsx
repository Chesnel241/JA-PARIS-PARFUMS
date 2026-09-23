"use client";

import { FormEvent, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { getLoginThrottle } from "@/app/connexion-admin/actions";

type Errors = { email?: string; password?: string; form?: { title: string; text?: string; tone: "danger" | "warning" } };

export function AdminLoginForm({ callbackUrl, initialError }: { callbackUrl: string; initialError?: { title: string; text?: string } }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>(initialError ? { form: { ...initialError, tone: "warning" } } : {});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const next: Errors = {};
    if (!email) next.email = "Saisissez votre adresse e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Adresse e-mail invalide.";
    if (!password) next.password = "Saisissez votre mot de passe.";
    else if (password.length < 12) next.password = "Le mot de passe contient au moins 12 caractères.";
    setErrors(next);
    if (next.email || next.password) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setPending(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false, redirectTo: callbackUrl });
      if (result?.error) {
        const throttle = await getLoginThrottle(email).catch(() => null);
        if (throttle?.blocked) {
          setErrors({ form: { tone: "danger", title: "Trop de tentatives.", text: `Par sécurité, la connexion est bloquée pendant encore ${throttle.retryInMinutes} minute${throttle.retryInMinutes > 1 ? "s" : ""}.` } });
        } else {
          const remaining = throttle?.remaining;
          setErrors({ form: { tone: "danger", title: "Adresse e-mail ou mot de passe incorrect.", text: typeof remaining === "number" && remaining <= 3 ? `Encore ${remaining} tentative${remaining > 1 ? "s" : ""} avant un blocage de 15 minutes.` : "Vérifiez vos identifiants puis réessayez." } });
        }
        setPending(false);
        window.requestAnimationFrame(() => (document.getElementById("admin-password") as HTMLInputElement | null)?.select());
        return;
      }
      // Navigation complète : l'admin se charge avec la nouvelle session.
      window.location.assign(callbackUrl);
    } catch {
      setErrors({ form: { tone: "danger", title: "Connexion impossible.", text: "Le serveur ne répond pas. Vérifiez votre connexion internet puis réessayez." } });
      setPending(false);
    }
  }

  return (
    <form ref={formRef} className="adm-login-form" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <div className={`adm-alert adm-alert--${errors.form.tone}`} role="alert">
          <CircleAlert aria-hidden />
          <div><strong>{errors.form.title}</strong>{errors.form.text && <div>{errors.form.text}</div>}</div>
        </div>
      )}
      <div className="adm-field">
        <label className="adm-label" htmlFor="admin-email">Adresse e-mail</label>
        <input id="admin-email" name="email" type="email" className="adm-input" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254}
          aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "admin-email-error" : undefined} autoFocus />
        {errors.email && <p className="adm-error" id="admin-email-error"><CircleAlert aria-hidden />{errors.email}</p>}
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor="admin-password">Mot de passe</label>
        <div className="adm-password">
          <input id="admin-password" name="password" type={showPassword ? "text" : "password"} className="adm-input" autoComplete="current-password" maxLength={128}
            aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? "admin-password-error" : undefined} />
          <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
        {errors.password && <p className="adm-error" id="admin-password-error"><CircleAlert aria-hidden />{errors.password}</p>}
      </div>
      <button className="adm-btn adm-btn--primary adm-btn--block" type="submit" disabled={pending} aria-busy={pending || undefined} style={{ minHeight: 48 }}>
        {pending ? <><LoaderCircle className="adm-spin" aria-hidden /> Connexion…</> : <>Se connecter <ArrowRight aria-hidden /></>}
      </button>
      <p className="adm-login-foot"><Lock aria-hidden /> Connexion chiffrée · 5 tentatives maximum</p>
    </form>
  );
}
