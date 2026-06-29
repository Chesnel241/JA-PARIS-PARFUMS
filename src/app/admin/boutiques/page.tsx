import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth-guard";

export const metadata = { title: "Boutiques · Maison" };

export default async function AdminStoresPage() {
  const user = await requireStaff();
  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <p>Retail</p>
          <h1>Les boutiques.</h1>
        </div>
      </header>
      <div className="admin-empty">Le CRUD des boutiques arrive dans la prochaine itération.</div>
    </AdminShell>
  );
}
