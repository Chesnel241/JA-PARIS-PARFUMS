import { notFound } from "next/navigation";
import { AmbassadorForm } from "@/components/admin/community-forms";
import { requireAdminStaff } from "@/components/admin/staff";
import { getAdminAmbassador } from "@/lib/community-service";

export const metadata = { title: "Modifier l'ambassadrice" };
export const dynamic = "force-dynamic";

export default async function EditAmbassadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, ambassador] = await Promise.all([requireAdminStaff(), getAdminAmbassador(id)]);
  if (!ambassador) notFound();
  return (
    <AmbassadorForm
      key={ambassador.id}
      ambassador={{ id: ambassador.id, name: ambassador.name, role: ambassador.role, photo: ambassador.photo, description: ambassador.description, instagram: ambassador.instagram, isActive: ambassador.isActive, sortOrder: ambassador.sortOrder }}
    />
  );
}
