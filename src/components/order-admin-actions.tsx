"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Ban, Package, Truck, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

type Body =
  | { action: "confirm-payment" }
  | { action: "cancel" }
  | { action: "set-status"; status: "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" };

export function OrderAdminActions({ id, status, paymentStatus }: { id: string; status: OrderStatus; paymentStatus: PaymentStatus }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function request(body: Body) {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Action impossible." }));
        setError(data.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  const isCancelled = status === "CANCELLED";
  const isPaid = paymentStatus === "PAID";

  return (
    <div className="product-admin-actions">
      {!isPaid && !isCancelled && (
        <button disabled={pending} onClick={() => request({ action: "confirm-payment" })}><BadgeCheck /> Confirmer le paiement</button>
      )}
      {isPaid && !isCancelled && status !== "PREPARING" && status !== "SHIPPED" && status !== "DELIVERED" && (
        <button disabled={pending} onClick={() => request({ action: "set-status", status: "PREPARING" })}><Package /> Préparation</button>
      )}
      {isPaid && !isCancelled && status !== "SHIPPED" && status !== "DELIVERED" && (
        <button disabled={pending} onClick={() => request({ action: "set-status", status: "SHIPPED" })}><Truck /> Expédiée</button>
      )}
      {isPaid && !isCancelled && status !== "DELIVERED" && (
        <button disabled={pending} onClick={() => request({ action: "set-status", status: "DELIVERED" })}><CheckCircle2 /> Livrée</button>
      )}
      {!isCancelled && status !== "DELIVERED" && (
        <button className="danger" disabled={pending} onClick={() => { if (window.confirm("Annuler cette commande ? Le stock sera restitué.")) request({ action: "cancel" }); }}><Ban /> Annuler</button>
      )}
      {error && <small>{error}</small>}
    </div>
  );
}
