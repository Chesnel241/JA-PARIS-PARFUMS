import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth-guard";

export const metadata = { title: "Articles · Maison" };

export default async function AdminArticlesPage() {
  const user = await requireStaff();
  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <p>Éditorial</p>
          <h1>Le Journal.</h1>
        </div>
      </header>
      <div className="admin-empty">Le CRUD des articles arrive dans la prochaine itération.</div>
    </AdminShell>
  );
}
