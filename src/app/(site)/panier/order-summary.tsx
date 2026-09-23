import Image from "next/image";
import { formatPrice } from "@/lib/data";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";
import { ShippingProgress } from "@/components/commerce/shipping-progress";

type SummaryLine = { key: string; name: string; volume: string; quantity: number; price: number; image: string };

// Récapitulatif des montants (et, en option, des articles en lecture seule).
export function OrderSummary({
  lines,
  subtotal,
  shipping,
  total,
  showLines = false,
  showProgress = true,
  children,
  title = "Récapitulatif",
}: {
  lines?: SummaryLine[];
  subtotal: number;
  shipping: number;
  total: number;
  showLines?: boolean;
  showProgress?: boolean;
  children?: React.ReactNode;
  title?: string;
}) {
  const count = lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  return (
    <section className="cm-summary" aria-labelledby="cm-summary-title">
      <h2 id="cm-summary-title" className="cm-summary__title">{title}</h2>
      {showLines && lines && lines.length > 0 ? (
        <ul className="cm-summary__lines" aria-label={`${count} article${count > 1 ? "s" : ""}`}>
          {lines.map((line) => {
            const src = safeImageSrc(line.image);
            return (
              <li key={line.key}>
                <span className="cm-summary__thumb">
                  <Image src={src} alt="" fill sizes="56px" unoptimized={isUnoptimizedImage(src)} className={isVectorImage(src) ? "is-contained" : "is-cover"} />
                  <span className="cm-summary__qty" aria-hidden="true">{line.quantity}</span>
                </span>
                <span className="cm-summary__name">
                  {line.name}
                  <small>{line.volume} · {line.quantity} × {formatPrice(line.price)}</small>
                </span>
                <span className="cm-summary__price">{formatPrice(line.price * line.quantity)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <dl className="cm-totals">
        <div>
          <dt>Sous-total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div>
          <dt>Livraison</dt>
          <dd>{shipping === 0 ? "Offerte" : formatPrice(shipping)}</dd>
        </div>
        <div className="cm-totals__grand">
          <dt>Total <small>TTC</small></dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {showProgress ? <ShippingProgress subtotal={subtotal} /> : null}
      {children}
    </section>
  );
}
