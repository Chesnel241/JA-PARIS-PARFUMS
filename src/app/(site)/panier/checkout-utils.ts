import type { CartItem } from "@/lib/cart";
import { computeShipping } from "@/lib/shipping";

// ---------------------------------------------------------------------------
// Formulaire de livraison : valeurs, validation client, erreurs de l'API.
// ---------------------------------------------------------------------------

export type CheckoutFields = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  address2: string;
  postalCode: string;
  city: string;
  country: string;
};

export type FieldName = keyof CheckoutFields;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const EMPTY_FIELDS: CheckoutFields = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  address: "",
  address2: "",
  postalCode: "",
  city: "",
  country: "France",
};

export const COUNTRIES = [
  "France",
  "Belgique",
  "Luxembourg",
  "Monaco",
  "Suisse",
  "Allemagne",
  "Espagne",
  "Italie",
  "Pays-Bas",
  "Portugal",
  "Royaume-Uni",
];

// Ordre d'affichage (et de focus sur la première erreur).
export const FIELD_ORDER: FieldName[] = ["email", "phone", "firstName", "lastName", "address", "address2", "postalCode", "city", "country"];

const isFrance = (country: string) => ["france", "monaco"].includes(country.trim().toLowerCase());

export function fullAddress(fields: CheckoutFields) {
  const extra = fields.address2.trim();
  return extra ? `${fields.address.trim()}, ${extra}` : fields.address.trim();
}

export function validateField(name: FieldName, fields: CheckoutFields): string | undefined {
  const value = fields[name].trim();
  switch (name) {
    case "email":
      if (!value) return "Indiquez votre adresse e-mail.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254
        ? undefined
        : "Adresse e-mail invalide (ex. nom@domaine.fr).";
    case "phone": {
      if (!value) return undefined; // facultatif
      const compact = value.replace(/[\s.\-()]/g, "");
      if (!/^\+?\d{9,15}$/.test(compact)) return "Numéro invalide (ex. 06 12 34 56 78).";
      if (isFrance(fields.country) && !compact.startsWith("+") && !/^0[1-9]\d{8}$/.test(compact)) {
        return "Numéro invalide (10 chiffres, ex. 06 12 34 56 78).";
      }
      return undefined;
    }
    case "firstName":
      if (!value) return "Indiquez votre prénom.";
      return value.length > 100 ? "100 caractères maximum." : undefined;
    case "lastName":
      if (!value) return "Indiquez votre nom.";
      return value.length > 100 ? "100 caractères maximum." : undefined;
    case "address":
      if (!value) return "Indiquez votre adresse (numéro et rue).";
      return fullAddress(fields).length > 200 ? "Adresse trop longue (200 caractères maximum)." : undefined;
    case "address2":
      return fullAddress(fields).length > 200 ? "Adresse trop longue (200 caractères maximum)." : undefined;
    case "postalCode":
      if (!value) return "Indiquez votre code postal.";
      if (isFrance(fields.country)) {
        return /^\d{5}$/.test(value.replace(/\s/g, "")) ? undefined : "Le code postal doit comporter 5 chiffres.";
      }
      return /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/.test(value) ? undefined : "Code postal invalide.";
    case "city":
      if (!value) return "Indiquez votre ville.";
      return value.length > 100 ? "100 caractères maximum." : undefined;
    case "country":
      return value ? undefined : "Choisissez un pays.";
  }
}

export function validateAll(fields: CheckoutFields): FieldErrors {
  const errors: FieldErrors = {};
  for (const name of FIELD_ORDER) {
    const message = validateField(name, fields);
    if (message) errors[name] = message;
  }
  return errors;
}

export function buildOrderPayload(fields: CheckoutFields, items: CartItem[]) {
  const phone = fields.phone.trim();
  return {
    email: fields.email.trim(),
    items: items.map((item) => ({
      slug: item.slug,
      name: item.name,
      image: item.image,
      volume: item.volume,
      price: item.price,
      quantity: item.quantity,
    })),
    deliveryAddress: {
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      address: fullAddress(fields),
      city: fields.city.trim(),
      postalCode: isFrance(fields.country) ? fields.postalCode.replace(/\s/g, "") : fields.postalCode.trim(),
      country: fields.country.trim(),
      ...(phone ? { phone } : {}),
    },
  };
}

// Messages d'erreur par champ renvoyés par l'API (422). Le format peut varier
// (zod flatten, objet à plat, chemins « deliveryAddress.city »…) : on parcourt
// défensivement et on ne garde que des messages en français.
const API_FIELD_MAP: Record<string, FieldName> = {
  email: "email",
  phone: "phone",
  firstName: "firstName",
  lastName: "lastName",
  address: "address",
  city: "city",
  postalCode: "postalCode",
  country: "country",
};

const FALLBACK_FIELD_MESSAGE: Record<FieldName, string> = {
  email: "Adresse e-mail invalide.",
  phone: "Numéro de téléphone invalide.",
  firstName: "Vérifiez votre prénom.",
  lastName: "Vérifiez votre nom.",
  address: "Vérifiez votre adresse.",
  address2: "Vérifiez le complément d’adresse.",
  postalCode: "Vérifiez votre code postal.",
  city: "Vérifiez votre ville.",
  country: "Vérifiez le pays.",
};

const looksFrench = (text: string) => /[éèêàùçô]|invalide|requis|obligatoire|doit|veuillez|indiquez|trop/i.test(text);

function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean);
  if (value && typeof value === "object" && "message" in value) return firstMessage((value as { message: unknown }).message);
  return undefined;
}

export function parseApiFieldErrors(fields: unknown): FieldErrors {
  const errors: FieldErrors = {};
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 4) return;
    for (const [rawKey, entry] of Object.entries(value as Record<string, unknown>)) {
      const key = rawKey.split(".").pop() ?? rawKey;
      const target = API_FIELD_MAP[key];
      if (target) {
        const message = firstMessage(entry);
        if (message) {
          errors[target] ??= message && looksFrench(message) ? message : FALLBACK_FIELD_MESSAGE[target];
        }
        if (entry && typeof entry === "object" && !Array.isArray(entry)) visit(entry, depth + 1);
      } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        visit(entry, depth + 1);
      }
    }
  };
  visit(fields, 0);
  return errors;
}

// ---------------------------------------------------------------------------
// Réponse de POST /api/orders → récapitulatif affiché à la confirmation.
// ---------------------------------------------------------------------------

export type ConfirmedOrder = {
  reference: string;
  email: string;
  firstName: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: { name: string; volume: string; quantity: number; price: number; image: string }[];
  createdAt: string;
};

const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined);
const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function referenceFromId(id: string) {
  return id.slice(-8).toUpperCase();
}

export function toConfirmedOrder(data: unknown, fallback: { fields: CheckoutFields; items: CartItem[] }): ConfirmedOrder {
  const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const order = (root.order && typeof root.order === "object" ? root.order : root) as Record<string, unknown>;
  const pick = (key: string) => order[key] ?? root[key];

  const id = asString(pick("id"));
  const reference =
    asString(pick("reference")) ??
    asString(pick("orderNumber")) ??
    (id ? referenceFromId(id) : "—");

  const serverItems = Array.isArray(order.items) ? order.items : [];
  const imageFor = (name: string, volume: string) =>
    fallback.items.find((item) => item.name === name && item.volume === volume)?.image ?? fallback.items[0]?.image ?? "";
  const items = serverItems.length > 0
    ? serverItems.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const line = raw as Record<string, unknown>;
        const name = asString(line.name) ?? "";
        const volume = asString(line.volume) ?? "";
        const quantity = asNumber(line.quantity) ?? 0;
        const price = asNumber(line.price) ?? 0;
        return name && quantity > 0 ? [{ name, volume, quantity, price, image: imageFor(name, volume) }] : [];
      })
    : fallback.items.map(({ name, volume, quantity, price, image }) => ({ name, volume, quantity, price, image }));

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = asNumber(pick("subtotal")) ?? asNumber(pick("subtotalAmount")) ?? itemsSubtotal;
  const total = asNumber(pick("totalAmount")) ?? asNumber(pick("total")) ?? subtotal + computeShipping(subtotal);
  const shipping = asNumber(pick("shippingAmount")) ?? asNumber(pick("shipping")) ?? Math.max(0, total - subtotal);

  return {
    reference,
    email: asString(pick("email")) ?? fallback.fields.email.trim(),
    firstName: fallback.fields.firstName.trim(),
    subtotal,
    shipping,
    total,
    items,
    createdAt: asString(pick("createdAt")) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Persistance de session (confirmation conservée au rechargement, brouillon).
// ---------------------------------------------------------------------------

const LAST_ORDER_KEY = "jae-last-order";
const DRAFT_KEY = "jae-checkout-draft";

function sessionGet(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export function saveLastOrder(order: ConfirmedOrder) {
  sessionSet(LAST_ORDER_KEY, JSON.stringify(order));
}

export function loadLastOrder(): ConfirmedOrder | null {
  const raw = sessionGet(LAST_ORDER_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ConfirmedOrder>;
    if (typeof data.reference !== "string" || typeof data.total !== "number" || !Array.isArray(data.items)) return null;
    return {
      reference: data.reference,
      email: typeof data.email === "string" ? data.email : "",
      firstName: typeof data.firstName === "string" ? data.firstName : "",
      subtotal: typeof data.subtotal === "number" ? data.subtotal : data.total,
      shipping: typeof data.shipping === "number" ? data.shipping : 0,
      total: data.total,
      items: data.items.filter((item) => item && typeof item.name === "string" && typeof item.quantity === "number"),
      createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    };
  } catch {
    return null;
  }
}

export function saveDraft(fields: CheckoutFields) {
  sessionSet(DRAFT_KEY, JSON.stringify(fields));
}

export function clearDraft() {
  sessionSet(DRAFT_KEY, null);
}

export function loadDraft(): CheckoutFields | null {
  const raw = sessionGet(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const fields = { ...EMPTY_FIELDS };
    for (const name of FIELD_ORDER) {
      const value = data[name];
      if (typeof value === "string") fields[name] = value.slice(0, 250);
    }
    return fields;
  } catch {
    return null;
  }
}
