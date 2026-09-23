// Export CSV compatible Excel (FR) et Google Sheets :
// - UTF-8 avec BOM (accents corrects dans Excel) ;
// - séparateur « ; » (séparateur de liste d'Excel en français) ;
// - échappement RFC 4180 (guillemets doublés, champs multi-lignes) ;
// - protection contre l'injection de formules (=, +, -, @, tabulation, retour
//   chariot en tête de cellule → préfixés d'une apostrophe).

export const CSV_DELIMITER = ";";
const UTF8_BOM = "﻿";
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_TRIGGERS.test(text)) text = `'${text}`;
  if (/[";,\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(CSV_DELIMITER));
  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
}

// Date lisible pour un tableur : « 2026-09-23 14:05 » (heure de Paris).
export function csvDate(date: Date | null | undefined) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function csvResponse(filenameBase: string, content: string) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}-${date}.csv`;
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
