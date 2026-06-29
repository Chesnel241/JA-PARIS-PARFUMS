import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth-guard";

export const metadata = { title: "Ambassadrices · Maison" };

export default async function AdminAmbassadorsPage() {
  const user = await requireStaff();
  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <p>Communauté</p>
          <h1>Les ambassadrices.</h1>
        </div>
      </header>
      <div className="admin-empty">Le CRUD des ambassadrices arrive dans la prochaine itération.</div>
    </AdminShell>
  );
}
