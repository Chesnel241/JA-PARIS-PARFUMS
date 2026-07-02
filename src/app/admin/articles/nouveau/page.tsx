import { AdminShell } from "@/components/admin-shell";
import { ArticleAdminForm } from "@/components/article-admin-form";
import { requireStaff } from "@/lib/auth-guard";

export const metadata = { title: "Nouvel article · Maison" };

export default async function NewArticlePage() {
  const user = await requireStaff();
  return <AdminShell user={user}><ArticleAdminForm /></AdminShell>;
}
