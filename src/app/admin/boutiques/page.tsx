import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { CommunityBoard } from "@/components/admin/community";
import { requireAdminStaff } from "@/components/admin/staff";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { listAdminStores } from "@/lib/community-service";

export const metadata = { title: "Boutiques" };
export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const [, stores] = await Promise.all([requireAdminStaff(), listAdminStores()]);
  return (
    <>
      <PageHeader
        eyebrow="Communauté"
        title="Boutiques"
        description="Les points de vente physiques affichés sur la page « Boutiques », dans l'ordre ci-dessous."
        actions={<Link className="adm-btn adm-btn--primary" href="/admin/boutiques/nouvelle"><Plus aria-hidden /> Ajouter</Link>}
      />
      {stores.length === 0 ? (
        <div className="adm-card">
          <EmptyState icon={Store} title="Aucune boutique" description="Ajoutez vos points de vente : adresse, horaires, téléphone et photo." action={<Link className="adm-btn adm-btn--primary" href="/admin/boutiques/nouvelle"><Plus aria-hidden /> Ajouter une boutique</Link>} />
        </div>
      ) : (
        <CommunityBoard kind="store" items={stores.map((item) => ({ id: item.id, name: item.name, address: item.address, city: item.city, country: item.country, phone: item.phone, openingHours: item.openingHours, image: item.image, isActive: item.isActive, sortOrder: item.sortOrder }))} />
      )}
    </>
  );
}
