"use client";

import { Minus, Plus } from "lucide-react";

// Sélecteur de quantité accessible. Les boutons en limite utilisent
// aria-disabled (et non disabled) pour ne pas faire perdre le focus clavier.
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div className={`cm-qty cm-qty--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Diminuer la quantité"
        aria-disabled={!canDecrease}
        onClick={() => canDecrease && onChange(value - 1)}
      >
        <Minus aria-hidden="true" />
      </button>
      <span className="cm-qty__value">{value}</span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        aria-disabled={!canIncrease}
        onClick={() => canIncrease && onChange(value + 1)}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
