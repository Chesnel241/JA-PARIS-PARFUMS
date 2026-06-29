import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ProductAdminForm } from "@/components/product-admin-form";
import { requireStaff } from "@/lib/auth-guard";
import { getAdminProduct } from "@/lib/product-service";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, product] = await Promise.all([requireStaff(), getAdminProduct(id)]);
  if (!product) notFound();
  return <AdminShell user={user}><ProductAdminForm product={product} /></AdminShell>;
}
