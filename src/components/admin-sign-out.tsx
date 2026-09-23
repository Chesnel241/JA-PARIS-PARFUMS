"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { signOutAction } from "@/components/admin/actions";

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button className="adm-nav-link adm-signout" type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <LoaderCircle className="adm-spin" aria-hidden /> : <LogOut aria-hidden />}
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}

export function AdminSignOut() {
  return (
    <form action={signOutAction}>
      <SignOutButton />
    </form>
  );
}
