"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ callbackUrl, initialError }: { callbackUrl: string; initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (result.error) {
        setError("Identifiants invalides ou accès temporairement suspendu.");
        return;
      }

      router.replace(result.url ?? callbackUrl);
      router.refresh();
    });
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label htmlFor="admin-email">Adresse email</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="admin-password">Mot de passe</label>
      <div className="password-field">
        <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={12} maxLength={128} />
        <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? <><LoaderCircle className="spin" /> Connexion…</> : <>Entrer dans la maison <ArrowRight /></>}
      </button>
    </form>
  );
}
