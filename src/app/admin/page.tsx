import { Box, CircleDollarSign, PackageCheck, Plus } from "lucide-react";
import Link from "next/link";
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

export default async function AdminPage() {
  const user = await requireStaff();
  const [revenue, orderCount, activeProductCount, lowStockCount, recentOrders] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 }, product: { isActive: true } } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, items: { take: 1, orderBy: { id: "asc" } } },
    }),
  ]);

  const cards = [
    { label: "Chiffre d’affaires", value: formatPrice(revenue._sum.totalAmount ?? 0), detail: "Commandes payées", icon: CircleDollarSign },
    { label: "Commandes", value: orderCount.toString(), detail: "Toutes périodes", icon: PackageCheck },
    { label: "Produits actifs", value: activeProductCount.toString(), detail: `${lowStockCount} alerte${lowStockCount > 1 ? "s" : ""} stock`, icon: Box },
  ];

  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <AdminShell user={user}>
        <header><div><p>{date}</p><h1>Bonjour, {user.name ?? "Maison JAE"}.</h1></div><Link className="admin-create-button" href="/admin/produits/nouveau"><Plus /> Nouveau produit</Link></header>
        <div className="stat-grid">{cards.map(({ label, value, detail, icon: Icon }) => <article key={label}><Icon /><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
        <div className="admin-table">
          <div className="table-heading"><h2>Commandes récentes</h2><a href="#">Tout afficher</a></div>
          {recentOrders.length === 0 ? <div className="admin-empty">Aucune commande pour le moment.</div> : recentOrders.map((order) => {
            const item = order.items[0];
            const row = [
              `#${order.id.slice(-8).toUpperCase()}`,
              order.user?.name ?? order.email,
              item ? `${item.name} · ${item.volume}${item.quantity > 1 ? ` × ${item.quantity}` : ""}` : "Commande",
              formatPrice(order.totalAmount),
              statusLabels[order.status],
            ];
            return <div className="table-row" key={order.id}>{row.map((cell, index) => <span key={`${order.id}-${index}`} className={index === 4 ? "status" : ""}>{cell}</span>)}</div>;
          })}
        </div>
    </AdminShell>
  );
}
