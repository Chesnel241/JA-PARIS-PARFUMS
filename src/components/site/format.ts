const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export function formatDate(date: Date | null | undefined) {
  return date ? dateFormatter.format(date) : null;
}

/** Temps de lecture estimé (200 mots / minute), au moins 1 minute. */
export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
