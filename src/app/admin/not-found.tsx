import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="adm-card">
      <div className="adm-empty">
        <span className="adm-empty-icon" aria-hidden><SearchX /></span>
        <h1 className="adm-title" style={{ fontSize: 28 }}>Page introuvable.</h1>
        <p>Cet élément n&apos;existe pas ou a été supprimé. Vérifiez l&apos;adresse ou revenez au tableau de bord.</p>
        <Link className="adm-btn adm-btn--primary" href="/admin"><LayoutDashboard aria-hidden /> Tableau de bord</Link>
      </div>
    </div>
  );
}
