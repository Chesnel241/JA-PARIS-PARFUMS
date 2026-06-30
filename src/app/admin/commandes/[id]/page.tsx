import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { OrderAdminActions } from "@/components/order-admin-actions";
import { requireStaff } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/data";
import { getAdminOrder } from "@/lib/order-service";

export const metadata = { title: "Commande · Maison" };

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

function formatAddress(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  const parts = [a.firstName, a.lastName, a.address, a.postalCode, a.city, a.country, a.phone]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, order] = await Promise.all([requireStaff(), getAdminOrder(id)]);
  if (!order) notFound();

  const reference = `#${order.id.slice(-8).toUpperCase()}`;
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });
  const address = formatAddress(order.deliveryAddress);
  const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = order.totalAmount - itemsTotal;

  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <Link href="/admin/commandes"><ArrowLeft /> Commandes</Link>
          <h1>Commande {reference}</h1>
        </div>
        <OrderAdminActions id={order.id} status={order.status} paymentStatus={order.paymentStatus} />
      </header>

      <div className="admin-order-detail">
        <section className="admin-form-card">
          <h2>Client &amp; livraison</h2>
          <div className="order-detail-row"><span>E-mail</span><strong>{order.email}</strong></div>
          <div className="order-detail-row"><span>Nom</span><strong>{order.user?.name ?? "Client invité"}</strong></div>
          <div className="order-detail-row"><span>Adresse</span><strong>{address ?? "Non renseignée"}</strong></div>
        </section>

        <section className="admin-form-card">
          <h2>Paiement &amp; suivi</h2>
          <div className="order-detail-row"><span>Paiement</span><strong>{paymentLabels[order.paymentStatus]}</strong></div>
          <div className="order-detail-row"><span>Statut</span><strong>{statusLabels[order.status]}</strong></div>
          <div className="order-detail-row"><span>Créée le</span><strong>{dateFormatter.format(order.createdAt)}</strong></div>
          <div className="order-detail-row"><span>Mise à jour</span><strong>{dateFormatter.format(order.updatedAt)}</strong></div>
        </section>

        <section className="admin-form-card admin-order-lines">
          <h2>Articles</h2>
          <div className="order-line-head"><span>Produit</span><span>Qté</span><span>Prix unitaire</span><span>Total</span></div>
          {order.items.map((item) => (
            <div className="order-line" key={item.id}>
              <span>{item.name} · {item.volume}</span>
              <span>{item.quantity}</span>
              <span>{formatPrice(item.price)}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="order-line"><span>Livraison</span><span /><span /><span>{shipping <= 0 ? "Offerte" : formatPrice(shipping)}</span></div>
          <div className="order-line order-line-total"><span>Total</span><span /><span /><span>{formatPrice(order.totalAmount)}</span></div>
        </section>
      </div>
    </AdminShell>
  );
}
