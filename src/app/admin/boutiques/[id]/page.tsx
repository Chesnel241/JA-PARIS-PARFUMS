import { notFound } from "next/navigation";
import { StoreForm } from "@/components/admin/community-forms";
import { requireAdminStaff } from "@/components/admin/staff";
import { getAdminStore } from "@/lib/community-service";

export const metadata = { title: "Modifier la boutique" };
export const dynamic = "force-dynamic";

export default async function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, store] = await Promise.all([requireAdminStaff(), getAdminStore(id)]);
  if (!store) notFound();
  return (
    <StoreForm
      key={store.id}
      store={{ id: store.id, name: store.name, address: store.address, city: store.city, country: store.country, phone: store.phone, openingHours: store.openingHours, image: store.image, isActive: store.isActive, sortOrder: store.sortOrder }}
    />
  );
}
