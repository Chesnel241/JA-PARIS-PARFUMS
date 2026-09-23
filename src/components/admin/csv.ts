// Export CSV généré dans le navigateur (aucune dépendance à l'API).
// - séparateur « ; » : ouverture directe dans Excel en français ;
// - UTF-8 avec BOM : accents correctement affichés dans Excel ;
// - chaque cellule entre guillemets, guillemets doublés ;
// - protection contre l'injection de formules (=, +, -, @, tabulation, retour
//   chariot en début de cellule) : la cellule est préfixée d'une apostrophe.

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const blob = new Blob(["﻿", toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvFilename(prefix: string) {
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}.csv`;
}
