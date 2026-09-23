import { notFound } from "next/navigation";
import { BadgeCheck, CircleDollarSign, Package, Truck, CheckCircle2 } from "lucide-react";
import { OrderAdminActions } from "@/components/order-admin-actions";
import { CopyButton } from "@/components/admin/copy-button";
import { requireAdminStaff } from "@/components/admin/staff";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { formatDateTime, formatEuros, formatLongDateTime, orderReference, plural } from "@/components/admin/format";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/labels";
import { getAdminOrder } from "@/lib/order-service";

export const metadata = { title: "Commande" };
export const dynamic = "force-dynamic";

function readAddress(value: unknown) {
  const a = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof a[key] === "string" ? (a[key] as string).trim() : "");
  return {
    name: [text("firstName"), text("lastName")].filter(Boolean).join(" "),
    address: text("address"),
    cityLine: [text("postalCode"), text("city")].filter(Boolean).join(" "),
    country: text("country"),
    phone: text("phone"),
  };
}

const STEPS = [
  { key: "PAID", label: "Payée", icon: CircleDollarSign },
  { key: "PREPARING", label: "Préparation", icon: Package },
  { key: "SHIPPED", label: "Expédiée", icon: Truck },
  { key: "DELIVERED", label: "Livrée", icon: CheckCircle2 },
];

function stepIndex(status: string, paid: boolean) {
  if (!paid) return -1;
  return { PENDING: 0, CONFIRMED: 0, PREPARING: 1, SHIPPED: 2, DELIVERED: 3 }[status] ?? 0;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, order] = await Promise.all([requireAdminStaff(), getAdminOrder(id)]);
  if (!order) notFound();

  const reference = orderReference(order.id);
  const address = readAddress(order.deliveryAddress);
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = Math.max(0, order.totalAmount - subtotal);
  const payment = PAYMENT_STATUS[order.paymentStatus];
  const status = ORDER_STATUS[order.status];
  const cancelled = order.status === "CANCELLED";
  const current = stepIndex(order.status, order.paymentStatus === "PAID");
  const addressLines = [address.name, address.address, address.cityLine, address.country].filter(Boolean);
  const addressText = [...addressLines, address.phone ? `Tél. ${address.phone}` : ""].filter(Boolean).join("\n");
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/commandes", label: "Commandes" }}
        title={`Commande ${reference}`}
        meta={<><Badge tone={payment.tone}>{payment.label}</Badge><Badge tone={status.tone}>{status.label}</Badge><span className="adm-muted" style={{ fontSize: 13 }}>Passée le {formatLongDateTime(order.createdAt)}</span></>}
      />

      <div className="adm-form-layout">
        <div className="adm-form-main">
          {!cancelled && (
            <Card title="Suivi">
              <ol className="adm-steps" aria-label="Progression de la commande">
                {STEPS.map((step, index) => {
                  const state = index <= current ? "done" : index === current + 1 ? "current" : "todo";
                  const Icon = step.icon;
                  return (
                    <li className="adm-step" key={step.key} data-state={state} aria-current={index === current ? "step" : undefined}>
                      <span><Icon aria-hidden />{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          <Card title={`Articles (${itemCount})`}>
            <div className="adm-lines">
              {order.items.map((item) => (
                <div className="adm-line" key={item.id}>
                  <span className="adm-line-name">{item.name}</span>
                  <span className="adm-line-total">{formatEuros(item.price * item.quantity)}</span>
                  <span className="adm-line-sub">{item.volume} · {item.quantity} × {formatEuros(item.price)}</span>
                </div>
              ))}
            </div>
            <div className="adm-totals">
              <div><span>Sous-total</span><span>{formatEuros(subtotal)}</span></div>
              <div><span>Livraison</span><span>{shipping === 0 ? "Offerte" : formatEuros(shipping)}</span></div>
              <div><span>Total</span><span>{formatEuros(order.totalAmount)}</span></div>
            </div>
          </Card>

          <Card title="Paiement">
            <dl className="adm-dl">
              <div><dt>Moyen</dt><dd>Lien de paiement Lydia (confirmation manuelle)</dd></div>
              <div><dt>Référence à rechercher sur Lydia</dt><dd><span className="adm-code">{reference}</span> · {formatEuros(order.totalAmount)}</dd></div>
              <div><dt>Statut du paiement</dt><dd><Badge tone={payment.tone}>{payment.label}</Badge></dd></div>
              <div><dt>Dernière mise à jour</dt><dd>{formatDateTime(order.updatedAt)}</dd></div>
            </dl>
          </Card>
        </div>

        <aside className="adm-form-aside" aria-label="Actions et client">
          <Card title="Actions">
            <OrderAdminActions id={order.id} reference={reference} totalAmount={order.totalAmount} status={order.status} paymentStatus={order.paymentStatus} />
          </Card>

          <Card title="Cliente">
            <dl className="adm-dl">
              <div><dt>Nom</dt><dd>{address.name || order.user?.name || "Non renseigné"}</dd></div>
              <div><dt>E-mail</dt><dd><a href={`mailto:${order.email}?subject=${encodeURIComponent(`Votre commande JAE ${reference}`)}`}>{order.email}</a></dd></div>
              {address.phone && <div><dt>Téléphone</dt><dd><a href={`tel:${address.phone.replace(/\s+/g, "")}`}>{address.phone}</a></dd></div>}
              <div><dt>Compte</dt><dd>{order.userId ? "Cliente inscrite" : "Commande invitée"} · {plural(itemCount, "article")}</dd></div>
            </dl>
          </Card>

          <Card title="Adresse de livraison" actions={addressLines.length > 0 ? <CopyButton text={addressText} label="Copier l'adresse" successMessage="Adresse copiée" /> : undefined}>
            {addressLines.length > 0 ? (
              <address className="adm-address">
                {addressLines.map((line) => <span key={line} style={{ display: "block" }}>{line}</span>)}
              </address>
            ) : <p className="adm-muted">Adresse non renseignée.</p>}
          </Card>

          {order.paymentStatus === "PAID" && !cancelled && (
            <p className="adm-help"><BadgeCheck aria-hidden />Paiement confirmé. Pensez à prévenir la cliente de l&apos;expédition par e-mail.</p>
          )}
        </aside>
      </div>
    </>
  );
}
