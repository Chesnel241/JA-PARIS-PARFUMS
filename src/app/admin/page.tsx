import Link from "next/link";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  ArrowRight, BookOpen, ChevronRight, CircleDollarSign, Clock, Images, Inbox, Mail, Package, PackageCheck,
  Palette, Plus, ShoppingBag, Sparkles, Store, TriangleAlert,
} from "lucide-react";
import { requireAdminStaff } from "@/components/admin/staff";
import { Badge, Card, EmptyState, KpiCard, PageHeader, Thumb } from "@/components/admin/ui";
import { formatDateTime, formatEuros, formatToday, orderReference, plural } from "@/components/admin/format";
import { LOW_STOCK_THRESHOLD, ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/labels";
import { countNewApplications } from "@/lib/community-service";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tableau de bord" };

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  const user = await requireAdminStaff();
  const since30 = new Date(Date.now() - 30 * DAY);

  const [revenue, revenue30, awaitingPayment, toPrepare, shipped, newApplications, subscribers, subscribers30, lowStock, recentOrders, activeProducts] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: PaymentStatus.PAID }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.aggregate({ where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: since30 } }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { paymentStatus: PaymentStatus.UNPAID, status: { not: OrderStatus.CANCELLED } }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID, status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] } } }),
    prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
    countNewApplications(),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gte: since30 } } }),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
      include: { product: { select: { id: true, name: true, images: true } } },
      orderBy: [{ stock: "asc" }, { volume: "asc" }],
      take: 8,
    }),
    prisma.order.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { items: { orderBy: { id: "asc" } }, user: { select: { name: true } } } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const firstName = user.name?.trim();

  return (
    <>
      <PageHeader
        eyebrow={formatToday()}
        title={firstName ? `Bonjour, ${firstName}.` : "Bonjour."}
        description="Voici l'essentiel de la boutique aujourd'hui."
        actions={<>
          <Link className="adm-btn adm-btn--secondary" href="/admin/articles/nouveau"><BookOpen aria-hidden /> Nouvel article</Link>
          <Link className="adm-btn adm-btn--primary" href="/admin/produits/nouveau"><Plus aria-hidden /> Nouveau produit</Link>
        </>}
      />

      <section aria-label="Indicateurs clés" className="adm-kpis">
        <KpiCard label="Chiffre d'affaires encaissé" icon={CircleDollarSign} tone="success" value={formatEuros(revenue._sum.totalAmount ?? 0)} meta={`${formatEuros(revenue30._sum.totalAmount ?? 0)} sur 30 jours · ${plural(revenue._count, "commande payée", "commandes payées")}`} />
        <KpiCard label="Paiements à confirmer" icon={Clock} tone="warning" href="/admin/commandes?filtre=to-pay" value={awaitingPayment._count} meta={awaitingPayment._count ? `${formatEuros(awaitingPayment._sum.totalAmount ?? 0)} à vérifier sur Lydia` : "Aucun paiement en attente"} />
        <KpiCard label="Commandes à préparer" icon={PackageCheck} tone="info" href="/admin/commandes?filtre=to-ship" value={toPrepare} meta={shipped ? `${plural(shipped, "colis")} en cours de livraison` : "Payées, à expédier"} />
        <KpiCard label="Nouvelles candidatures" icon={Inbox} tone="brand" href="/admin/candidatures?statut=NEW" value={newApplications} meta="Devenir ambassadrice" />
        <KpiCard label="Abonnés newsletter" icon={Mail} href="/admin/newsletter" value={subscribers} meta={subscribers30 ? `+${subscribers30} sur 30 jours` : "Le cercle JAE"} />
        <KpiCard label="Produits en ligne" icon={Package} href="/admin/produits" value={activeProducts} meta={lowStock.length ? `${plural(lowStock.length, "alerte")} de stock` : "Stock suffisant"} />
      </section>

      <div className="adm-dash-grid">
        <Card flush title="Dernières commandes" actions={<Link className="adm-card-link" href="/admin/commandes">Toutes les commandes <ArrowRight aria-hidden /></Link>}>
          {recentOrders.length === 0 ? (
            <EmptyState headingLevel={3} icon={ShoppingBag} title="Aucune commande pour le moment" description="Les commandes passées sur la boutique apparaîtront ici, prêtes à être confirmées." />
          ) : (
            <ul className="adm-list" style={{ marginTop: 12 }}>
              {recentOrders.map((order) => {
                const address = order.deliveryAddress as Record<string, unknown> | null;
                const customer = [address?.firstName, address?.lastName].filter((part) => typeof part === "string").join(" ") || order.user?.name || order.email;
                const payment = PAYMENT_STATUS[order.paymentStatus];
                const status = ORDER_STATUS[order.status];
                const showPayment = order.status !== OrderStatus.CANCELLED && order.paymentStatus !== PaymentStatus.PAID;
                return (
                  <li key={order.id}>
                    <Link className="adm-list-item adm-list-item--stack" href={`/admin/commandes/${order.id}`}>
                      <span className="adm-list-item-text">
                        <strong>{orderReference(order.id)} · {customer}</strong>
                        <span>{formatDateTime(order.createdAt)} · {plural(order.items.reduce((sum, item) => sum + item.quantity, 0), "article")}</span>
                      </span>
                      <span className="adm-list-item-end">
                        {showPayment ? <Badge tone={payment.tone}>{payment.label}</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
                        <strong className="adm-num">{formatEuros(order.totalAmount)}</strong>
                      </span>
                      <ChevronRight aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="adm-stack-lg">
          <Card flush title="Alertes de stock" description={`Variantes en ligne avec ${LOW_STOCK_THRESHOLD} unités ou moins`}>
            {lowStock.length === 0 ? (
              <EmptyState headingLevel={3} icon={PackageCheck} title="Stock suffisant" description="Aucune variante publiée n'est en rupture ou en stock bas." />
            ) : (
              <ul className="adm-list" style={{ marginTop: 12 }}>
                {lowStock.map((variant) => (
                  <li key={variant.id}>
                    <Link className="adm-list-item" href={`/admin/produits/${variant.product.id}`}>
                      <Thumb src={variant.product.images[0]} contain />
                      <span className="adm-list-item-text">
                        <strong>{variant.product.name}</strong>
                        <span>{variant.volume} · {variant.sku}</span>
                      </span>
                      <span className="adm-list-item-end">
                        {variant.stock === 0
                          ? <Badge tone="danger">Rupture</Badge>
                          : <Badge tone="warning">{plural(variant.stock, "restant")}</Badge>}
                      </span>
                      <ChevronRight aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Actions rapides">
            <div className="adm-quick">
              <Link href="/admin/produits/nouveau"><Package aria-hidden /> Ajouter un produit</Link>
              <Link href="/admin/articles/nouveau"><BookOpen aria-hidden /> Écrire un article</Link>
              <Link href="/admin/ambassadrices/nouvelle"><Sparkles aria-hidden /> Ajouter une ambassadrice</Link>
              <Link href="/admin/boutiques/nouvelle"><Store aria-hidden /> Ajouter une boutique</Link>
              <Link href="/admin/medias"><Images aria-hidden /> Téléverser des images</Link>
              <Link href="/admin/apparence"><Palette aria-hidden /> Modifier l&apos;accueil</Link>
            </div>
          </Card>

          {awaitingPayment._count > 0 && (
            <div className="adm-alert adm-alert--warning">
              <TriangleAlert aria-hidden />
              <div>
                <strong>{plural(awaitingPayment._count, "paiement")} Lydia à vérifier.</strong>
                <div>Comparez les montants reçus sur Lydia avec la référence de commande, puis confirmez le paiement. <Link className="adm-link" href="/admin/commandes?filtre=to-pay">Voir les commandes</Link></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
