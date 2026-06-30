import Link from "next/link";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { OrderAdminActions } from "@/components/order-admin-actions";
import { requireStaff } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/data";
import { listAdminOrders } from "@/lib/order-service";

export const metadata = { title: "Commandes · Maison" };

export const dynamic = "force-dynamic";

const statusLabels = {
  PENDING: "À confirmer",
  CONFIRMED: "Confirmée",
  PREPARING: "Préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
} as const;

const paymentLabels = {
  UNPAID: "À régler",
  PAID: "Payée",
  REFUNDED: "Remboursée",
  FAILED: "Échouée",
} as const;

const filters: { key: string; label: string; where?: Prisma.OrderWhereInput }[] = [
  { key: "all", label: "Toutes" },
  { key: "to-pay", label: "À régler", where: { paymentStatus: PaymentStatus.UNPAID, status: { not: OrderStatus.CANCELLED } } },
  { key: "paid", label: "Payées", where: { paymentStatus: PaymentStatus.PAID } },
  { key: "processing", label: "En cours", where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.SHIPPED] } } },
  { key: "delivered", label: "Livrées", where: { status: OrderStatus.DELIVERED } },
  { key: "cancelled", label: "Annulées", where: { status: OrderStatus.CANCELLED } },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const activeFilter = filters.find((option) => option.key === filtre) ?? filters[0];
  const [user, orders] = await Promise.all([requireStaff(), listAdminOrders(activeFilter.where)]);
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <AdminShell user={user}>
      <header className="admin-content-header"><div><p>Logistique</p><h1>Les commandes.</h1></div></header>
      <nav className="admin-filter-bar">
        {filters.map((option) => (
          <Link key={option.key} href={option.key === "all" ? "/admin/commandes" : `/admin/commandes?filtre=${option.key}`} className={option.key === activeFilter.key ? "active" : ""}>
            {option.label}
          </Link>
        ))}
      </nav>
      <div className="admin-order-list">
        <div className="admin-order-list-head"><span>Commande</span><span>Articles</span><span>Total</span><span>Paiement</span><span>Statut</span><span>Actions</span></div>
        {orders.length === 0 ? (
          <div className="admin-empty">Aucune commande dans cette catégorie.</div>
        ) : orders.map((order) => (
          <article className="admin-order-row" key={order.id}>
            <div className="admin-order-identity">
              <Link href={`/admin/commandes/${order.id}`}>#{order.id.slice(-8).toUpperCase()}</Link>
              <small>{dateFormatter.format(order.createdAt)}</small>
              <small>{order.user?.name ?? order.email}</small>
            </div>
            <div className="admin-order-items">
              {order.items.map((item) => <span key={item.id}>{item.name} · {item.volume}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>)}
            </div>
            <span className="admin-order-total">{formatPrice(order.totalAmount)}</span>
            <span className="admin-order-payment"><i className={order.paymentStatus.toLowerCase()} />{paymentLabels[order.paymentStatus]}</span>
            <span>{statusLabels[order.status]}</span>
            <OrderAdminActions id={order.id} status={order.status} paymentStatus={order.paymentStatus} />
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
