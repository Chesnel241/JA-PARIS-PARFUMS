import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const statusLabels = {
  PENDING: "À confirmer",
  CONFIRMED: "Confirmée",
  PREPARING: "Préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
} as const;

export const metadata = { title: "Commandes · Maison" };

export default async function AdminOrdersPage() {
  const user = await requireStaff();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } }, items: { take: 1 } },
  });

  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <p>Logistique</p>
          <h1>Les commandes.</h1>
        </div>
      </header>
      <div className="admin-product-list">
        <div className="admin-product-list-head">
          <span>Réf.</span>
          <span>Client</span>
          <span>Produit</span>
          <span>Montant</span>
          <span>Statut</span>
        </div>
        {orders.length === 0 ? (
          <div className="admin-empty">Aucune commande pour le moment.</div>
        ) : (
          orders.map((order) => {
            const item = order.items[0];
            return (
              <div className="admin-product-row" key={order.id}>
                <span>#{order.id.slice(-8).toUpperCase()}</span>
                <span>{order.user?.name ?? order.email}</span>
                <span>{item ? `${item.name} · ${item.volume}` : "—"}</span>
                <span>{formatPrice(order.totalAmount)}</span>
                <span className="status">{statusLabels[order.status]}</span>
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
