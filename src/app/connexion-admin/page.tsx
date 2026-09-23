import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentStaff } from "@/lib/current-staff";

export const metadata = { title: "Connexion à l'administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// N'accepte qu'un chemin interne de l'admin (pas de redirection ouverte).
function safeCallback(value: string | undefined) {
  if (!value || !/^\/admin(?:[/?#]|$)/.test(value) || value.includes("//") || value.includes("\\")) return "/admin";
  return value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);

  // Vérifie le compte en base (et non le seul jeton) : un compte désactivé ou
  // rétrogradé ne boucle plus entre /admin et /connexion-admin.
  const [staff, session] = await Promise.all([getCurrentStaff().catch(() => null), auth().catch(() => null)]);
  if (staff) redirect(callbackUrl);

  const initialError = params.error === "AccessDenied"
    ? session?.user
      ? { title: "Accès refusé.", text: "Ce compte n'a pas (ou plus) accès à l'administration. Connectez-vous avec un compte autorisé." }
      : { title: "Session expirée.", text: "Reconnectez-vous pour continuer." }
    : params.error
      ? { title: "Connexion impossible.", text: "Réessayez avec vos identifiants." }
      : undefined;

  return (
    <div className="adm-login">
      <aside className="adm-login-aside" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/craft.jpg" alt="" />
        <div className="adm-login-aside-content">
          <div className="adm-brand" style={{ padding: 0 }}><strong>JAE</strong><span>Paris</span></div>
          <div>
            <blockquote>La beauté du geste,<br /><em>la précision du détail.</em></blockquote>
            <p>Collection, commandes, Journal et communauté : toute la maison au même endroit.</p>
          </div>
        </div>
      </aside>
      <main className="adm-login-main">
        <div className="adm-login-brand"><strong>JAE</strong><span>Paris</span></div>
        <section className="adm-login-card" aria-labelledby="login-title">
          <h1 id="login-title">Espace administration</h1>
          <p>Connectez-vous pour gérer la boutique.</p>
          <AdminLoginForm callbackUrl={callbackUrl} initialError={initialError} />
        </section>
        <Link className="adm-login-back" href="/">← Retour à la boutique</Link>
      </main>
    </div>
  );
}
