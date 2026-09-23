// Formats partagés (serveur et client). Fuseau fixé sur Paris : les dates
// sont identiques quel que soit le fuseau du serveur (Vercel = UTC).
const TIME_ZONE = "Europe/Paris";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const longDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: TIME_ZONE });
const csvDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const todayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: Date | string) => dateFormatter.format(toDate(value));
export const formatDateTime = (value: Date | string) => dateTimeFormatter.format(toDate(value));
export const formatLongDateTime = (value: Date | string) => longDateTimeFormatter.format(toDate(value));
export const formatCsvDate = (value: Date | string) => csvDateFormatter.format(toDate(value));
export const formatToday = () => todayFormatter.format(new Date());

export function formatEuros(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

// Même référence que celle montrée au client et à reporter dans le paiement Lydia.
export function orderReference(order: { id: string; reference?: string | null }) {
  return order.reference ?? `JAE-${order.id.slice(-8).toUpperCase()}`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? pluralForm : singular}`;
}

export function initials(value: string) {
  const parts = value.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "J";
}

// « @jae.paris », « jae.paris » ou une URL → URL Instagram cliquable.
export function instagramUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }
  const handle = raw.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}/` : null;
}

export function instagramHandle(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (match) return `@${match[1]}`;
  return raw.startsWith("@") ? raw : `@${raw}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
