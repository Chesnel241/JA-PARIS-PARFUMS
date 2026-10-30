// « Les Heures » : chaque parfum de la maison porte une heure de la journée.
// Module sans dépendance serveur (importable côté client) : palettes de
// lumière, créneaux horaires, heure de Paris et petites aides de français.

// ---------------------------------------------------------------------------
// Palettes : la couleur vient des parfums, jamais de l'interface. Liste fermée
// (choisie dans l'admin) : aucune couleur libre ne peut être injectée en CSS.
// Contraste : `ink` est lisible sur `tint` (≥ 7:1) ; `accent` est décoratif.
// ---------------------------------------------------------------------------

export type Palette = {
  label: string;
  /** Couleur d'accent de l'interface (pastilles, tracés, barres). */
  accent: string;
  /** Fond de la scène du flacon. */
  tint: string;
  /** Halo de lumière de la scène. */
  glow: string;
  /** Texte posé sur `tint`. */
  ink: string;
  /** Dégradé du jus dans le flacon (haut, bas). */
  liquid: [string, string];
  /** Teinte du créneau sur la frise de la journée. */
  band: string;
  dark: boolean;
};

export const PALETTES = {
  soleil: { label: "Soleil — matin doré", accent: "#D8962A", tint: "#F2CD84", glow: "#FFF4D4", ink: "#2B1C05", liquid: ["#FBE2A2", "#E2A443"], band: "#E0A240", dark: false },
  poudre: { label: "Poudre — fin du jour rosée", accent: "#C47884", tint: "#EFD3CC", glow: "#FFF6F0", ink: "#3A1E22", liquid: ["#F7E6B8", "#DDB96E"], band: "#E3A3A8", dark: false },
  grenat: { label: "Grenat — minuit", accent: "#B3312C", tint: "#43161F", glow: "#B85A40", ink: "#F8E7DA", liquid: ["#C9772F", "#5A230C"], band: "#B3312C", dark: true },
  lilas: { label: "Lilas — heure bleue", accent: "#8E6BB0", tint: "#DCD0EA", glow: "#F6F1FB", ink: "#271B35", liquid: ["#EFE4F7", "#B79AD6"], band: "#B79AD6", dark: false },
  sauge: { label: "Sauge — après-midi au jardin", accent: "#6E8A5A", tint: "#D3DCC4", glow: "#F5F8EF", ink: "#1E2716", liquid: ["#EEF2D9", "#A9BC8A"], band: "#A9BC8A", dark: false },
  ambre: { label: "Ambre — soleil couchant", accent: "#B8642E", tint: "#EDBF95", glow: "#FFF0E2", ink: "#2E1608", liquid: ["#F7D9A8", "#C9772F"], band: "#D98A4E", dark: false },
  encre: { label: "Encre — nuit bleue", accent: "#4F6BB0", tint: "#1E2440", glow: "#5A6FA8", ink: "#E6EAF7", liquid: ["#9FB0D9", "#2B3566"], band: "#4F6BB0", dark: true },
  or: { label: "Or — neutre", accent: "#9C7432", tint: "#E9E3D7", glow: "#FFFBF2", ink: "#141413", liquid: ["#F7E6B8", "#DDB96E"], band: "#C9A86A", dark: false },
} as const satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof PALETTES;
export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

/** Or de la maison : accent par défaut des pages sans parfum. */
export const GOLD = PALETTES.or.accent;

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PALETTES, value);
}

export function paletteOf(key: string | null | undefined): Palette {
  return isPaletteKey(key) ? PALETTES[key] : PALETTES.or;
}

// ---------------------------------------------------------------------------
// Heures
// ---------------------------------------------------------------------------

export const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DAY_MINUTES = 1440;

/** « 19:00 » → 1140 ; null si le format n'est pas HH:MM (00:00 à 23:59). */
export function parseHour(value: string | null | undefined): number | null {
  if (!value || !HOUR_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 1140 → « 19:00 » (modulo 24 h). */
export function formatMinutes(total: number): string {
  const value = ((Math.round(total) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

/** Minutes écoulées depuis minuit, heure de Paris (repli : heure locale). */
export function parisMinutes(date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
    const minutes = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hours * 60 + minutes;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

// ---------------------------------------------------------------------------
// Créneaux : chaque parfum horodaté est « l'heure de » à partir de son début
// de créneau (hourFrom, ou à défaut son heure signature) jusqu'au début du
// créneau suivant, en boucle sur 24 h.
// ---------------------------------------------------------------------------

export type Timed = { slug: string; hour: string | null; hourFrom: string | null };

export type Slot<T extends Timed> = { item: T; hour: number; from: number; to: number };

export function buildSchedule<T extends Timed>(items: T[]): Slot<T>[] {
  const timed = items
    .map((item) => {
      const hour = parseHour(item.hour);
      if (hour === null) return null;
      return { item, hour, from: parseHour(item.hourFrom) ?? hour };
    })
    .filter((entry): entry is { item: T; hour: number; from: number } => entry !== null)
    .sort((a, b) => a.from - b.from || a.item.slug.localeCompare(b.item.slug));
  // Deux parfums sur le même début de créneau : seul le premier est retenu.
  const unique = timed.filter((entry, index) => index === 0 || entry.from !== timed[index - 1].from);
  return unique.map((entry, index) => {
    const next = unique[(index + 1) % unique.length];
    const to = unique.length === 1 ? entry.from + DAY_MINUTES : next.from > entry.from ? next.from : next.from + DAY_MINUTES;
    return { ...entry, to };
  });
}

export function slotAt<T extends Timed>(schedule: Slot<T>[], minutes: number): Slot<T> | null {
  if (schedule.length === 0) return null;
  const value = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return schedule.find((slot) => (value >= slot.from && value < slot.to) || (value + DAY_MINUTES >= slot.from && value + DAY_MINUTES < slot.to)) ?? schedule[0];
}

export type Segment = { slug: string; left: number; width: number; primary: boolean };

/** Segments de la frise 0 h → 24 h (en %), un créneau à cheval sur minuit est coupé en deux. */
export function daySegments<T extends Timed>(schedule: Slot<T>[]): Segment[] {
  const segments: Segment[] = [];
  for (const slot of schedule) {
    const start = slot.from;
    const end = slot.to;
    if (end <= DAY_MINUTES) {
      segments.push({ slug: slot.item.slug, left: (start / DAY_MINUTES) * 100, width: ((end - start) / DAY_MINUTES) * 100, primary: true });
    } else {
      const first = DAY_MINUTES - start;
      const second = end - DAY_MINUTES;
      segments.push({ slug: slot.item.slug, left: (start / DAY_MINUTES) * 100, width: (first / DAY_MINUTES) * 100, primary: first >= second });
      segments.push({ slug: slot.item.slug, left: 0, width: (second / DAY_MINUTES) * 100, primary: second > first });
    }
  }
  return segments.filter((segment) => segment.width > 0).sort((a, b) => a.left - b.left);
}

/** Dégradé CSS de la frise (couleurs de palettes uniquement, jamais de saisie libre). */
export function dayGradient(segments: Segment[], colorOf: (slug: string) => string): string {
  if (segments.length === 0) return `linear-gradient(90deg, ${PALETTES.or.band}, ${PALETTES.or.band})`;
  const blend = 2;
  const stops = segments.flatMap((segment) => {
    const color = colorOf(segment.slug);
    const start = segment.left === 0 ? 0 : segment.left + blend;
    const end = segment.left + segment.width >= 99.99 ? 100 : segment.left + segment.width - blend;
    return [`${color} ${start.toFixed(2)}%`, `${color} ${Math.max(start, end).toFixed(2)}%`];
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Écart circulaire entre deux heures, en minutes (0 à 720). */
export function hourDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % DAY_MINUTES;
  return Math.min(delta, DAY_MINUTES - delta);
}

// ---------------------------------------------------------------------------
// Français
// ---------------------------------------------------------------------------

/** « d’ » devant une voyelle ou un h muet, sinon « de ». */
export function dePrefix(name: string): string {
  return /^[aeiouyéèêëàâîïôûùh]/i.test(name.trim()) ? "d’" : "de ";
}

/** « d’Illusion », « d’Or Solaire », « de Nuit Souveraine ». */
export function deName(name: string): string {
  return `${dePrefix(name)}${name}`;
}

/** [« néroli », « mandarine », « santal »] → « néroli, mandarine et santal ». */
export function listFr(values: string[], lower = true): string {
  const items = values.map((value) => (lower ? value.toLocaleLowerCase("fr-FR") : value));
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

const NUMBERS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

/** Nombre en toutes lettres (jusqu'à douze), au féminin si besoin. */
export function numberWord(value: number, feminine = false): string {
  if (value === 1) return feminine ? "une" : "un";
  return NUMBERS[value] ?? String(value);
}

export function capitalize(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1) : value;
}
