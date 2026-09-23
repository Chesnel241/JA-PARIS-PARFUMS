"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/data";
import type { CartItem } from "@/lib/cart";
import { maxQuantityForStock } from "@/components/commerce/cart-rules";
import { QuantityStepper } from "@/components/commerce/quantity-stepper";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";

// Ligne de panier partagée par le tiroir et la page panier.
export function CartLine({
  item,
  onQuantity,
  onRemove,
  onNavigate,
  size = "md",
  priority = false,
}: {
  item: CartItem;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
  size?: "sm" | "md";
  priority?: boolean;
}) {
  const src = safeImageSrc(item.image);
  const max = maxQuantityForStock(item.stock);
  const href = `/produit/${encodeURIComponent(item.slug)}`;
  const lowStock = item.stock !== undefined && item.stock <= 3;

  return (
    <div className={`cm-line cm-line--${size}`}>
      <Link href={href} className="cm-line__media" onClick={onNavigate} tabIndex={-1} aria-hidden="true">
        <Image
          src={src}
          alt=""
          fill
          priority={priority}
          sizes={size === "sm" ? "96px" : "(max-width: 760px) 104px, 132px"}
          unoptimized={isUnoptimizedImage(src)}
          className={isVectorImage(src) ? "is-contained" : "is-cover"}
        />
      </Link>
      <div className="cm-line__body">
        <div className="cm-line__head">
          <div className="cm-line__title">
            <Link href={href} onClick={onNavigate} className="cm-line__name">{item.name}</Link>
            <p className="cm-line__meta">
              {item.volume}
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, prix unitaire </span>
              {formatPrice(item.price)}
            </p>
          </div>
          <p className="cm-line__total">
            <span className="sr-only">Total de la ligne : </span>
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>
        <div className="cm-line__actions">
          <QuantityStepper
            value={item.quantity}
            max={Math.max(1, max)}
            onChange={onQuantity}
            label={`Quantité pour ${item.name}, ${item.volume}`}
            size={size}
          />
          <button type="button" className="cm-line__remove" onClick={onRemove} aria-label={`Retirer ${item.name}, ${item.volume} du panier`}>
            <X aria-hidden="true" />
            <span>Retirer</span>
          </button>
        </div>
        {item.quantity >= max ? (
          <p className="cm-line__hint">
            {lowStock ? `Quantité maximale disponible : ${max}` : `Maximum ${max} par article`}
          </p>
        ) : lowStock ? (
          <p className="cm-line__hint">Plus que {item.stock} en stock</p>
        ) : null}
      </div>
    </div>
  );
}
