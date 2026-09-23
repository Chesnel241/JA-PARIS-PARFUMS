import { StoreForm } from "@/components/admin/community-forms";
import { requireAdminStaff } from "@/components/admin/staff";
import { listAdminStores } from "@/lib/community-service";

export const metadata = { title: "Nouvelle boutique" };
export const dynamic = "force-dynamic";

export default async function NewStorePage() {
  const [, existing] = await Promise.all([requireAdminStaff(), listAdminStores()]);
  const nextSortOrder = Math.min(9999, existing.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10);
  return <StoreForm nextSortOrder={nextSortOrder} />;
}
