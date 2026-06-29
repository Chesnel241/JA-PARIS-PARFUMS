import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Connexion à la Maison" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const callbackUrl = params.callbackUrl?.startsWith("/admin") ? params.callbackUrl : "/admin";
  if (session?.user && (session.user.role === "ADMIN" || session.user.role === "EDITOR")) redirect(callbackUrl);

  return (
    <div className="admin-login-page">
      <div className="admin-login-art"><div className="login-monogram">J</div><p>La beauté du geste.<br />La précision du détail.</p></div>
      <section className="admin-login-panel">
        <Link className="login-wordmark" href="/"><span>JAE</span><small>PARIS</small></Link>
        <div className="login-card">
          <p className="eyebrow">Espace Maison</p>
          <h1>Bienvenue<br /><em>chez JAE.</em></h1>
          <p>Connectez-vous pour gérer la collection, les commandes et le Journal.</p>
          <AdminLoginForm callbackUrl={callbackUrl} initialError={params.error === "AccessDenied" ? "Ce compte ne possède pas les droits nécessaires." : undefined} />
          <div className="login-security"><ShieldCheck /> Connexion protégée · 5 tentatives maximum</div>
        </div>
      </section>
    </div>
  );
}
