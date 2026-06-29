import { AdminShell } from "@/components/admin-shell";
import { ProductAdminForm } from "@/components/product-admin-form";
import { requireStaff } from "@/lib/auth-guard";

export const metadata = { title: "Nouveau produit · Maison" };

export default async function NewProductPage() {
  const user = await requireStaff();
  return <AdminShell user={user}><ProductAdminForm /></AdminShell>;
}
