import Link from "next/link";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { SearchX, ShoppingBag } from "lucide-react";
import { OrderAdminActions } from "@/components/order-admin-actions";
import { requireAdminStaff } from "@/components/admin/staff";
import { UrlSearchField } from "@/components/admin/search-field";
import { Badge, Card, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { formatDateTime, formatEuros, orderReference } from "@/components/admin/format";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/labels";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Commandes" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

// Les clés ?filtre= existantes sont conservées (liens et favoris).
const filters: { key: string; label: string; where?: Prisma.OrderWhereInput }[] = [
  { key: "all", label: "Toutes" },
  { key: "to-pay", label: "À encaisser", where: { paymentStatus: PaymentStatus.UNPAID, status: { not: OrderStatus.CANCELLED } } },
  { key: "to-ship", label: "À préparer", where: { paymentStatus: PaymentStatus.PAID, status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] } } },
  { key: "paid", label: "Payées", where: { paymentStatus: PaymentStatus.PAID } },
  { key: "processing", label: "En cours", where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.SHIPPED] } } },
  { key: "delivered", label: "Livrées", where: { status: OrderStatus.DELIVERED } },
  { key: "cancelled", label: "Annulées", where: { status: OrderStatus.CANCELLED } },
];

function searchWhere(raw: string): Prisma.OrderWhereInput | undefined {
  const q = raw.trim().slice(0, 100);
  if (!q) return undefined;
  const reference = q.replace(/^#/, "").toLowerCase();
  const capitalized = q.charAt(0).toUpperCase() + q.slice(1).toLowerCase();
  const nameMatches = [q, capitalized].flatMap((value) => [
    { deliveryAddress: { path: ["lastName"], string_contains: value } },
    { deliveryAddress: { path: ["firstName"], string_contains: value } },
  ]);
  return {
    OR: [
      { email: { contains: q, mode: "insensitive" } },
      ...(reference.length >= 4 ? [{ id: { endsWith: reference } }] : []),
      { items: { some: { name: { contains: q, mode: "insensitive" } } } },
      ...nameMatches,
    ],
  };
}

function customerName(address: unknown, fallback: string) {
  const a = (address && typeof address === "object" ? address : {}) as Record<string, unknown>;
  const name = [a.firstName, a.lastName].filter((part): part is string => typeof part === "string" && part.trim() !== "").join(" ");
  return name || fallback;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; page?: string }> }) {
  const [, params] = await Promise.all([requireAdminStaff(), searchParams]);
  const activeFilter = filters.find((option) => option.key === params.filtre) ?? filters[0];
  const q = params.q ?? "";
  const search = searchWhere(q);
  const where: Prisma.OrderWhereInput = { AND: [activeFilter.where ?? {}, search ?? {}] };
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [total, counts] = await Promise.all([
    prisma.order.count({ where }),
    Promise.all(filters.map((option) => prisma.order.count({ where: option.where }))),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const orders = await prisma.order.findMany({
    where,
    include: { items: { orderBy: { id: "asc" } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const hrefFor = (next: { filtre?: string; page?: number }) => {
    const query = new URLSearchParams();
    const filtre = next.filtre ?? activeFilter.key;
    if (filtre !== "all") query.set("filtre", filtre);
    if (q) query.set("q", q);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const value = query.toString();
    return value ? `/admin/commandes?${value}` : "/admin/commandes";
  };

  return (
    <>
      <PageHeader eyebrow="Ventes" title="Commandes" description="Confirmez les paiements Lydia, puis suivez chaque commande jusqu'à la livraison." />

      <nav className="adm-tabs" aria-label="Filtrer les commandes">
        {filters.map((option, index) => (
          <Link key={option.key} className="adm-tab" href={hrefFor({ filtre: option.key })} aria-current={option.key === activeFilter.key ? "page" : undefined} scroll={false}>
            {option.label}<span className="adm-tab-count">{counts[index]}</span>
          </Link>
        ))}
      </nav>

      <Card flush>
        <div className="adm-toolbar">
          <UrlSearchField label="Rechercher une commande" placeholder="Référence, e-mail, nom ou produit…" />
          <span className="adm-toolbar-meta" aria-live="polite">{total.toLocaleString("fr-FR")} commande{total > 1 ? "s" : ""}</span>
        </div>
        {orders.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title="Aucun résultat" description={`Aucune commande ne correspond à « ${q} » dans cette vue.`} action={<Link className="adm-btn adm-btn--secondary" href={hrefFor({})}>Effacer la recherche</Link>} />
          ) : (
            <EmptyState icon={ShoppingBag} title={activeFilter.key === "all" ? "Aucune commande pour le moment" : "Rien dans cette catégorie"} description={activeFilter.key === "all" ? "Les commandes passées sur la boutique apparaîtront ici." : "Aucune commande ne correspond à ce filtre. Tout est à jour !"} />
          )
        ) : (
          <table className="adm-table">
            <caption className="adm-sr-only">Liste des commandes</caption>
            <thead>
              <tr><th scope="col">Commande</th><th scope="col">Articles</th><th scope="col" className="adm-align-right">Total</th><th scope="col">Paiement</th><th scope="col">Statut</th><th scope="col"><span className="adm-sr-only">Action</span></th></tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const reference = orderReference(order.id);
                const payment = PAYMENT_STATUS[order.paymentStatus];
                const status = ORDER_STATUS[order.status];
                const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id} data-clickable>
                    <td className="adm-td-primary">
                      <div className="adm-cell-main-text">
                        <Link className="adm-row-link adm-cell-title" href={`/admin/commandes/${order.id}`}>{reference} · {customerName(order.deliveryAddress, order.user?.name ?? order.email)}</Link>
                        <span className="adm-cell-sub">{formatDateTime(order.createdAt)} · {order.email}</span>
                      </div>
                    </td>
                    <td data-label="Articles">
                      <span className="adm-cell-sub" title={order.items.map((item) => `${item.quantity} × ${item.name} ${item.volume}`).join(", ")}>
                        {quantity} · {order.items.slice(0, 2).map((item) => `${item.name} ${item.volume}`).join(", ")}{order.items.length > 2 ? "…" : ""}
                      </span>
                    </td>
                    <td className="adm-align-right adm-td-aside"><strong className="adm-num" style={{ color: "var(--adm-text)" }}>{formatEuros(order.totalAmount)}</strong></td>
                    <td data-label="Paiement"><Badge tone={payment.tone}>{payment.label}</Badge></td>
                    <td data-label="Statut"><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td className="adm-td-actions">
                      <div className="adm-row-actions">
                        <OrderAdminActions layout="row" id={order.id} reference={reference} totalAmount={order.totalAmount} status={order.status} paymentStatus={order.paymentStatus} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination page={page} pageCount={pageCount} total={total} label="commandes" hrefFor={(next) => hrefFor({ page: next })} />
      </Card>
    </>
  );
}
