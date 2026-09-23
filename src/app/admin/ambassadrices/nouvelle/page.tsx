import { AmbassadorForm } from "@/components/admin/community-forms";
import { requireAdminStaff } from "@/components/admin/staff";
import { listAdminAmbassadors } from "@/lib/community-service";

export const metadata = { title: "Nouvelle ambassadrice" };
export const dynamic = "force-dynamic";

export default async function NewAmbassadorPage() {
  const [, existing] = await Promise.all([requireAdminStaff(), listAdminAmbassadors()]);
  const nextSortOrder = Math.min(9999, existing.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10);
  return <AmbassadorForm nextSortOrder={nextSortOrder} />;
}
