"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Copy, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { LYDIA_PAYMENT_URL } from "@/components/commerce/constants";
import { OrderSummary } from "./order-summary";
import type { ConfirmedOrder } from "./checkout-utils";

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // repli ci-dessous
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function OrderConfirmation({ order }: { order: ConfirmedOrder }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    return () => window.clearTimeout(timer.current);
  }, []);

  const onCopy = async () => {
    const ok = await copyText(order.reference);
    setCopied(ok ? "done" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied("idle"), 2500);
  };

  const reveal = (delay: number) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const } };

  const card = order.method === "card";
  const processing = card && order.paymentState !== "paid";
  const lead = !card
    ? "Votre commande est réservée. Il ne reste qu’à la régler avec Lydia."
    : processing
      ? "Votre paiement est en cours de validation par votre banque. Votre commande est réservée et sera confirmée dès son acceptation."
      : "Votre paiement a bien été reçu. Nous préparons votre commande avec soin.";

  return (
    <div className="cm-confirm">
      <motion.div className="cm-confirm__intro" {...reveal(0)}>
        <span className="cm-confirm__icon" aria-hidden="true">{processing ? <Clock /> : <Check />}</span>
        <p className="eyebrow">{card ? (processing ? "Paiement en cours de validation" : "Paiement confirmé") : "Commande enregistrée"}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Merci{order.firstName ? `, ${order.firstName}` : ""}.
        </h1>
        <p className="cm-confirm__lead">{lead}</p>
      </motion.div>

      <motion.div className="cm-confirm__card" {...reveal(0.08)}>
        <div className="cm-confirm__ref">
          <span className="cm-confirm__label">Référence de commande</span>
          <strong className="cm-confirm__code">{order.reference}</strong>
          <button type="button" className="cm-copy" onClick={onCopy}>
            {copied === "done" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied === "done" ? "Copiée" : copied === "failed" ? "Copie impossible" : "Copier"}
          </button>
          <span className="sr-only" aria-live="polite">{copied === "done" ? "Référence copiée." : ""}</span>
        </div>
        <div className="cm-confirm__amount">
          <span className="cm-confirm__label">{!card ? "Montant à régler" : processing ? "Montant en cours de paiement" : "Montant réglé par carte"}</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </motion.div>

      {card ? (
        <motion.ol className="cm-confirm__steps" {...reveal(0.16)}>
          <li>
            <span aria-hidden="true">1</span>
            <p>
              {processing
                ? <>Paiement de <strong>{formatPrice(order.total)}</strong> en cours de validation.</>
                : <>Paiement de <strong>{formatPrice(order.total)}</strong> reçu, en toute sécurité via Stripe.</>}
            </p>
          </li>
          <li><span aria-hidden="true">2</span><p>Votre commande est préparée et expédiée sous <strong>2 à 3 jours</strong>.</p></li>
          <li><span aria-hidden="true">3</span><p>Nous vous écrivons{order.email ? <> à <strong>{order.email}</strong></> : null} dès l’expédition de votre colis.</p></li>
        </motion.ol>
      ) : (
        <motion.ol className="cm-confirm__steps" {...reveal(0.16)}>
          <li><span aria-hidden="true">1</span><p>Cliquez sur <strong>« Payer avec Lydia »</strong>.</p></li>
          <li><span aria-hidden="true">2</span><p>Réglez <strong>{formatPrice(order.total)}</strong> en indiquant la référence <strong>{order.reference}</strong> dans le message du paiement.</p></li>
          <li><span aria-hidden="true">3</span><p>Nous confirmons votre paiement par e-mail{order.email ? <> ({order.email})</> : null} et expédions votre commande.</p></li>
        </motion.ol>
      )}

      <motion.div className="cm-confirm__actions" {...reveal(0.24)}>
        {card ? (
          <Link className="primary-button cm-block-button" href="/boutique">Continuer mes achats</Link>
        ) : (
          <>
            <a className="primary-button cm-block-button" href={LYDIA_PAYMENT_URL} target="_blank" rel="noopener noreferrer">
              Payer avec Lydia <ExternalLink aria-hidden="true" size={16} />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <Link className="cm-text-button" href="/boutique">Continuer mes achats</Link>
          </>
        )}
      </motion.div>

      {order.items.length > 0 ? (
        <motion.div className="cm-confirm__summary" {...reveal(0.32)}>
          <OrderSummary
            title="Votre commande"
            showLines
            showProgress={false}
            lines={order.items.map((item, index) => ({ key: `${item.name}-${item.volume}-${index}`, ...item }))}
            subtotal={order.subtotal}
            shipping={order.shipping}
            total={order.total}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
