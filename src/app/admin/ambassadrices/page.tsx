import Link from "next/link";
import { Inbox, Plus, Sparkles } from "lucide-react";
import { CommunityBoard } from "@/components/admin/community";
import { requireAdminStaff } from "@/components/admin/staff";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { countNewApplications, listAdminAmbassadors } from "@/lib/community-service";

export const metadata = { title: "Ambassadrices" };
export const dynamic = "force-dynamic";

export default async function AdminAmbassadorsPage() {
  const [, ambassadors, newApplications] = await Promise.all([requireAdminStaff(), listAdminAmbassadors(), countNewApplications()]);
  return (
    <>
      <PageHeader
        eyebrow="Communauté"
        title="Ambassadrices"
        description="Les visages de la maison, affichés sur la page « Ambassadrices » dans l'ordre ci-dessous."
        actions={<>
          <Link className="adm-btn adm-btn--secondary" href="/admin/candidatures"><Inbox aria-hidden /> Candidatures{newApplications > 0 ? ` (${newApplications})` : ""}</Link>
          <Link className="adm-btn adm-btn--primary" href="/admin/ambassadrices/nouvelle"><Plus aria-hidden /> Ajouter</Link>
        </>}
      />
      {ambassadors.length === 0 ? (
        <div className="adm-card">
          <EmptyState icon={Sparkles} title="Aucune ambassadrice" description="Présentez les femmes qui incarnent JAE : photo, métier, quelques mots et leur Instagram." action={<Link className="adm-btn adm-btn--primary" href="/admin/ambassadrices/nouvelle"><Plus aria-hidden /> Ajouter une ambassadrice</Link>} />
        </div>
      ) : (
        <CommunityBoard kind="ambassador" items={ambassadors.map((item) => ({ id: item.id, name: item.name, role: item.role, photo: item.photo, description: item.description, instagram: item.instagram, isActive: item.isActive, sortOrder: item.sortOrder }))} />
      )}
    </>
  );
}
