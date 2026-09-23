import { ArticleAdminForm } from "@/components/article-admin-form";
import { requireAdminStaff } from "@/components/admin/staff";

export const metadata = { title: "Nouvel article" };

export default async function NewArticlePage() {
  await requireAdminStaff();
  return <ArticleAdminForm />;
}
