import type { Product } from "@/lib/data";

/** Pyramide olfactive en trois cartes (tête, cœur, fond). */
export function Notes3({ notes }: { notes: Product["notes"] }) {
  const rows = [
    { label: "Tête", values: notes.top },
    { label: "Cœur", values: notes.heart },
    { label: "Fond", values: notes.base },
  ].filter((row) => row.values.length > 0);
  if (rows.length === 0) return null;
  return (
    <dl className="notes3">
      {rows.map((row) => (
        <div key={row.label}><dt>{row.label}</dt><dd>{row.values.join(", ")}</dd></div>
      ))}
    </dl>
  );
}
