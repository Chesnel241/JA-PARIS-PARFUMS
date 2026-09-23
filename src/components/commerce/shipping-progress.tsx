import { Check } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

// Jauge « Plus que X € pour la livraison offerte » / « Livraison offerte ».
export function ShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const ratio = Math.min(1, Math.max(0, subtotal / FREE_SHIPPING_THRESHOLD));
  const reached = remaining === 0;

  return (
    <div className={`cm-ship${reached ? " is-reached" : ""}`}>
      <p className="cm-ship__label">
        {reached ? (
          <><Check aria-hidden="true" /> Livraison offerte</>
        ) : (
          <>Plus que <strong>{formatPrice(remaining)}</strong> pour la livraison offerte</>
        )}
      </p>
      <div
        className="cm-ship__track"
        role="progressbar"
        aria-label="Progression vers la livraison offerte"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <span style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}
