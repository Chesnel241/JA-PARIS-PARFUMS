import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminStaff } from "@/components/admin/staff";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: { template: "%s · Admin JAE", default: "Administration · JAE" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Le layout possède le shell : la barre latérale persiste entre les pages
// (navigation fluide) et l'accès est vérifié ici en plus de chaque page.
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminStaff();
  return <AdminShell user={user}>{children}</AdminShell>;
}
