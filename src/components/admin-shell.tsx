import Link from "next/link";
import type { Role } from "@prisma/client";
import { AdminNav } from "@/components/admin-nav";
import { AdminSignOut } from "@/components/admin-sign-out";

export function AdminShell({ user, children }: { user: { email: string; role: Role }; children: React.ReactNode }) {
  return (
    <div className="admin-page">
      <aside>
        <div className="admin-brand">JAE <small>MAISON</small></div>
        <AdminNav />
        <div className="admin-aside-footer"><Link href="/">← Retour au site</Link><AdminSignOut /></div>
      </aside>
      <section>
        <div className="admin-notice"><span>Session sécurisée</span><span>{user.email} · {user.role === "ADMIN" ? "Administrateur" : "Éditeur"}</span></div>
        {children}
      </section>
    </div>
  );
}
