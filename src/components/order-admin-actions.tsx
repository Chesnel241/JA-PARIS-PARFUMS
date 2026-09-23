"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, BadgeCheck, CheckCircle2, LoaderCircle, Package, Truck } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { formatEuros } from "@/components/admin/format";

type OrderStatusValue = "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type PaymentStatusValue = "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
type FulfillmentStatus = "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED";
type Body = { action: "confirm-payment" } | { action: "cancel" } | { action: "set-status"; status: FulfillmentStatus };

type Props = {
  id: string;
  reference: string;
  totalAmount: number;
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  layout?: "row" | "detail";
};

const NEXT_STEP: Partial<Record<OrderStatusValue, { status: FulfillmentStatus; label: string; short: string; icon: typeof Package; hint: string }>> = {
  PENDING: { status: "PREPARING", label: "Passer en préparation", short: "Préparer", icon: Package, hint: "" },
  CONFIRMED: { status: "PREPARING", label: "Passer en préparation", short: "Préparer", icon: Package, hint: "Le paiement est reçu : préparez le colis." },
  PREPARING: { status: "SHIPPED", label: "Marquer comme expédiée", short: "Expédier", icon: Truck, hint: "Le colis est prêt ? Marquez-le comme expédié une fois déposé." },
  SHIPPED: { status: "DELIVERED", label: "Marquer comme livrée", short: "Livrée", icon: CheckCircle2, hint: "Le colis est en route. Marquez la commande livrée à réception." },
};

const CORRECTION_OPTIONS: { value: FulfillmentStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Confirmée (paiement reçu)" },
  { value: "PREPARING", label: "En préparation" },
  { value: "SHIPPED", label: "Expédiée" },
  { value: "DELIVERED", label: "Livrée" },
];

const SUCCESS: Record<string, string> = {
  "confirm-payment": "Paiement confirmé",
  cancel: "Commande annulée",
  PREPARING: "Commande en préparation",
  SHIPPED: "Commande marquée expédiée",
  DELIVERED: "Commande marquée livrée",
  CONFIRMED: "Statut mis à jour",
};

export function OrderAdminActions({ id, reference, totalAmount, status, paymentStatus, layout = "detail" }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<string>("");

  const isCancelled = status === "CANCELLED";
  const isPaid = paymentStatus === "PAID";
  const next = isPaid && !isCancelled ? NEXT_STEP[status] : undefined;
  const canConfirmPayment = !isPaid && !isCancelled && paymentStatus !== "REFUNDED";
  const canCancel = !isCancelled && status !== "DELIVERED";
  const busy = pending || Boolean(running);

  async function run(body: Body, key: string) {
    setRunning(key);
    const result = await adminRequest(`/api/admin/orders/${id}`, { method: "PATCH", json: body });
    setRunning("");
    if (!result.ok) {
      toast.apiError(result, "La commande n'a pas été modifiée");
      return;
    }
    toast.success(`${SUCCESS[body.action === "set-status" ? body.status : body.action]} · ${reference}`);
    startTransition(() => router.refresh());
  }

  async function confirmPayment() {
    const ok = await confirm({
      title: `Confirmer le paiement de ${reference} ?`,
      description: `Vérifiez d'abord sur Lydia que vous avez bien reçu ${formatEuros(totalAmount)}. La commande passera en « Confirmée ».`,
      confirmLabel: "Oui, paiement reçu",
    });
    if (ok) await run({ action: "confirm-payment" }, "confirm-payment");
  }

  async function cancel() {
    const ok = await confirm({
      title: `Annuler la commande ${reference} ?`,
      description: isPaid
        ? `Le stock sera restitué et la commande passera en « Remboursée ». Pensez à rembourser ${formatEuros(totalAmount)} à la cliente via Lydia. Cette action est définitive.`
        : "Le stock réservé sera restitué. Cette action est définitive.",
      confirmLabel: "Annuler la commande",
      cancelLabel: "Conserver",
      tone: "danger",
    });
    if (ok) await run({ action: "cancel" }, "cancel");
  }

  const spinner = (key: string, Icon: typeof Package) => (running === key ? <LoaderCircle className="adm-spin" aria-hidden /> : <Icon aria-hidden />);

  if (layout === "row") {
    if (canConfirmPayment) {
      return <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy} onClick={confirmPayment}>{spinner("confirm-payment", BadgeCheck)} Confirmer le paiement</button>;
    }
    if (next) {
      return <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy} onClick={() => run({ action: "set-status", status: next.status }, next.status)}>{spinner(next.status, next.icon)} {next.short}</button>;
    }
    return null;
  }

  return (
    <div className="adm-stack">
      {isCancelled ? (
        <div className="adm-next">
          <p className="adm-next-title">Commande annulée</p>
          <p>Le stock a été restitué.{paymentStatus === "REFUNDED" ? " Le paiement est marqué remboursé : vérifiez que le remboursement Lydia a bien été effectué." : ""}</p>
        </div>
      ) : canConfirmPayment ? (
        <div className="adm-next" data-tone="warning">
          <p className="adm-next-title">En attente du paiement Lydia</p>
          <p>Vérifiez sur Lydia la réception de <strong>{formatEuros(totalAmount)}</strong> (référence {reference}), puis confirmez.</p>
          <div className="adm-next-actions">
            <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={confirmPayment}>{spinner("confirm-payment", BadgeCheck)} Confirmer le paiement</button>
          </div>
        </div>
      ) : next ? (
        <div className="adm-next" data-tone="info">
          <p className="adm-next-title">Prochaine étape</p>
          {next.hint && <p>{next.hint}</p>}
          <div className="adm-next-actions">
            <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => run({ action: "set-status", status: next.status }, next.status)}>{spinner(next.status, next.icon)} {next.label}</button>
          </div>
        </div>
      ) : (
        <div className="adm-next">
          <p className="adm-next-title">{status === "DELIVERED" ? "Commande livrée" : "Aucune action requise"}</p>
          <p>{status === "DELIVERED" ? "Cette commande est terminée." : "Rien à faire pour le moment."}</p>
        </div>
      )}

      {isPaid && !isCancelled && (
        <div className="adm-field">
          <label className="adm-label" htmlFor={`status-${id}`}>Corriger le statut</label>
          <select id={`status-${id}`} className="adm-input" value={status === "PENDING" ? "CONFIRMED" : status} disabled={busy}
            onChange={(event) => run({ action: "set-status", status: event.target.value as FulfillmentStatus }, event.target.value)}>
            {CORRECTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <p className="adm-hint">En cas d&apos;erreur de manipulation, revenez à l&apos;étape voulue.</p>
        </div>
      )}

      {canCancel && (
        <button type="button" className="adm-btn adm-btn--danger-ghost" disabled={busy} onClick={cancel}>{spinner("cancel", Ban)} Annuler la commande</button>
      )}
    </div>
  );
}
