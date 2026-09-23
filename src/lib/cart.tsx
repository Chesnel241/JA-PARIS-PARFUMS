"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE, maxQuantityForStock } from "@/components/commerce/cart-rules";
import { safeImageSrc } from "@/components/commerce/media";
import { computeShipping } from "@/lib/shipping";

export { MAX_CART_LINES, MAX_QUANTITY_PER_LINE, maxQuantityForStock };

// ---------------------------------------------------------------------------
// Panier : état client persistant (localStorage), robuste et synchronisé.
// - stockage versionné (jae-cart-v2), migration depuis l'ancienne clé jae-cart ;
// - contenu stocké validé : une donnée corrompue donne un panier vide, jamais
//   un crash ;
// - aucune lecture du stockage pendant le rendu serveur : `hydrated` indique
//   quand le panier réel est chargé (évite tout écart d'hydratation) ;
// - synchronisation entre onglets (événement `storage`) ;
// - quantités bornées (1 à 10, et au stock connu), lignes identiques fusionnées.
// Le serveur reste la source de vérité des prix et du stock à la commande.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "jae-cart-v2";
const LEGACY_STORAGE_KEY = "jae-cart";
const STORAGE_VERSION = 2;

export type CartItem = {
  slug: string;
  name: string;
  image: string;
  volume: string;
  price: number; // centimes
  quantity: number;
  stock?: number; // stock connu au dernier contrôle (facultatif)
};

export type CartItemInput = Omit<CartItem, "quantity">;
export type AddItemResult = { quantity: number; added: number; limited: boolean };

// Instantané du catalogue utilisé pour réconcilier le panier avec le serveur.
export type CatalogSnapshot = {
  slug: string;
  name: string;
  image: string;
  variants: { volume: string; price: number; stock: number }[];
};

export type CartAdjustment =
  | { type: "removed"; slug: string; name: string; volume: string; reason: "unavailable" | "out-of-stock" }
  | { type: "limited"; slug: string; name: string; volume: string; quantity: number }
  | { type: "price"; slug: string; name: string; volume: string; previous: number; price: number };

export type CartContextValue = {
  items: CartItem[];
  count: number;
  /** Sous-total en centimes (conservé pour compatibilité ; identique à `subtotal`). */
  total: number;
  subtotal: number;
  shipping: number;
  grandTotal: number;
  /** true une fois le panier du navigateur chargé (false pendant le SSR / 1er rendu). */
  hydrated: boolean;
  /** Alias de `hydrated`. */
  ready: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: CartItemInput, quantity?: number) => AddItemResult;
  updateQuantity: (slug: string, volume: string, quantity: number) => void;
  removeItem: (slug: string, volume: string) => void;
  clearCart: () => void;
  /** Quantité maximale autorisée pour une ligne (plafond 10 et stock connu). */
  maxQuantityFor: (slug: string, volume: string, stock?: number) => number;
  /** Aligne prix et stock sur le catalogue serveur ; renvoie les ajustements faits. */
  reconcile: (catalog: CatalogSnapshot[]) => CartAdjustment[];
};

// --- Validation / normalisation -------------------------------------------------

const lineKey = (slug: string, volume: string) => `${slug}\u0000${volume}`;

function toInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeStock(value: unknown): number | undefined {
  const stock = toInteger(value);
  return stock !== null && stock >= 0 ? stock : undefined;
}

function sanitizeLine(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const slug = cleanText(record.slug, 200);
  const volume = cleanText(record.volume, 64);
  const name = cleanText(record.name, 200);
  const price = toInteger(record.price);
  const quantity = toInteger(record.quantity);
  if (!slug || !volume || !name || price === null || price < 0 || quantity === null || quantity < 1) return null;
  const stock = normalizeStock(record.stock);
  const max = maxQuantityForStock(stock);
  if (max < 1) return null;
  const line: CartItem = { slug, name, image: safeImageSrc(record.image), volume, price, quantity: Math.min(quantity, max) };
  if (stock !== undefined) line.stock = stock;
  return line;
}

// Valide chaque ligne, fusionne les doublons (même produit + contenance) et
// borne le nombre de lignes. Idempotent.
function normalizeItems(list: unknown[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const raw of list) {
    const line = sanitizeLine(raw);
    if (!line) continue;
    const key = lineKey(line.slug, line.volume);
    const existing = merged.get(key);
    if (existing) {
      const stock = line.stock ?? existing.stock;
      merged.set(key, { ...existing, ...line, quantity: Math.min(existing.quantity + line.quantity, maxQuantityForStock(stock)) });
    } else if (merged.size < MAX_CART_LINES) {
      merged.set(key, line);
    }
  }
  return [...merged.values()];
}

function serialize(items: CartItem[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, items });
}

// null = rien de stocké ; [] = donnée absente ou corrompue.
function parseStoredCart(raw: string | null): CartItem[] | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: unknown[] }).items)
        : null;
    return list ? normalizeItems(list) : [];
  } catch {
    return [];
  }
}

// --- Accès au stockage (toujours protégé : mode privé, quota, cookies bloqués) ---

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    if (window.localStorage.getItem(key) !== value) window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : le panier reste fonctionnel en mémoire.
  }
}

function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function loadStoredCart(): { items: CartItem[]; rewrite: boolean } {
  const raw = storageGet(STORAGE_KEY);
  const current = parseStoredCart(raw);
  if (current !== null) return { items: current, rewrite: raw !== serialize(current) };
  const legacy = parseStoredCart(storageGet(LEGACY_STORAGE_KEY));
  if (legacy !== null) {
    storageRemove(LEGACY_STORAGE_KEY);
    return { items: legacy, rewrite: true };
  }
  return { items: [], rewrite: false };
}

// --- Réconciliation avec le catalogue serveur -----------------------------------

export function reconcileCartItems(items: CartItem[], catalog: CatalogSnapshot[]) {
  const bySlug = new Map(catalog.map((product) => [product.slug, product]));
  const adjustments: CartAdjustment[] = [];
  const next: CartItem[] = [];
  let changed = false;

  for (const item of items) {
    const product = bySlug.get(item.slug);
    const variant = product?.variants.find((entry) => entry.volume === item.volume);
    if (!product || !variant) {
      adjustments.push({ type: "removed", slug: item.slug, name: item.name, volume: item.volume, reason: "unavailable" });
      changed = true;
      continue;
    }
    const stock = Math.max(0, Math.trunc(variant.stock));
    if (stock < 1) {
      adjustments.push({ type: "removed", slug: item.slug, name: product.name, volume: item.volume, reason: "out-of-stock" });
      changed = true;
      continue;
    }
    const max = maxQuantityForStock(stock);
    const quantity = Math.min(item.quantity, max);
    if (quantity < item.quantity) {
      adjustments.push({ type: "limited", slug: item.slug, name: product.name, volume: item.volume, quantity });
    }
    if (variant.price !== item.price) {
      adjustments.push({ type: "price", slug: item.slug, name: product.name, volume: item.volume, previous: item.price, price: variant.price });
    }
    const image = safeImageSrc(product.image);
    const updated: CartItem = { ...item, name: product.name, image, price: variant.price, quantity, stock };
    if (
      updated.name !== item.name || updated.image !== item.image || updated.price !== item.price ||
      updated.quantity !== item.quantity || updated.stock !== item.stock
    ) {
      changed = true;
    }
    next.push(updated);
  }

  return { items: changed ? next : items, adjustments, changed };
}

// --- Contexte -------------------------------------------------------------------

const CartContext = createContext<CartContextValue | null>(null);

const noop = () => {};
const INERT_CART: CartContextValue = {
  items: [],
  count: 0,
  total: 0,
  subtotal: 0,
  shipping: 0,
  grandTotal: 0,
  hydrated: false,
  ready: false,
  isDrawerOpen: false,
  openDrawer: noop,
  closeDrawer: noop,
  addItem: () => ({ quantity: 0, added: 0, limited: false }),
  updateQuantity: noop,
  removeItem: noop,
  clearCart: noop,
  maxQuantityFor: () => MAX_QUANTITY_PER_LINE,
  reconcile: () => [],
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const itemsRef = useRef<CartItem[]>([]);
  const hydratedRef = useRef(false);
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  const announce = useCallback((text: string) => {
    setAnnouncement((previous) => ({ id: previous.id + 1, text }));
  }, []);

  // Met à jour l'état + le stockage, de façon synchrone via la ref pour que
  // plusieurs actions rapprochées (double clic) voient toujours l'état courant.
  const commit = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
    if (hydratedRef.current) storageSet(STORAGE_KEY, serialize(next));
  }, []);

  useEffect(() => {
    const { items: stored, rewrite } = loadStoredCart();
    // Articles ajoutés avant la fin du chargement (cas extrême) : fusionnés.
    const pending = hydratedRef.current ? [] : itemsRef.current;
    const initial = pending.length > 0 ? normalizeItems([...stored, ...pending]) : stored;
    hydratedRef.current = true;
    itemsRef.current = initial;
    setItems(initial);
    if (rewrite || initial !== stored) storageSet(STORAGE_KEY, serialize(initial));
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      // key === null : le stockage a été entièrement vidé (autre onglet).
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      const next = event.key === null ? [] : parseStoredCart(event.newValue) ?? [];
      itemsRef.current = next;
      setItems(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Le tiroir se referme dès que l'on change de page.
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    setDrawerOpen(false);
  }, [pathname]);

  const maxQuantityFor = useCallback((slug: string, volume: string, stock?: number) => {
    const line = itemsRef.current.find((item) => item.slug === slug && item.volume === volume);
    return maxQuantityForStock(normalizeStock(stock) ?? line?.stock);
  }, []);

  const addItem = useCallback((input: CartItemInput, quantity = 1): AddItemResult => {
    const requested = Math.max(1, toInteger(quantity) ?? 1);
    const current = itemsRef.current;
    const key = lineKey(input.slug, input.volume);
    const existing = current.find((item) => lineKey(item.slug, item.volume) === key);
    const before = existing?.quantity ?? 0;
    const stock = normalizeStock(input.stock) ?? existing?.stock;
    const max = maxQuantityForStock(stock);
    if (max < 1 || (!existing && current.length >= MAX_CART_LINES)) {
      return { quantity: before, added: 0, limited: true };
    }
    const target = Math.min(max, before + requested);
    const line = sanitizeLine({ ...existing, ...input, stock, quantity: target });
    if (!line) return { quantity: before, added: 0, limited: false };
    commit(existing ? current.map((item) => (lineKey(item.slug, item.volume) === key ? line : item)) : [...current, line]);
    const added = target - before;
    announce(
      added > 0
        ? `${line.name}, ${line.volume} ajouté au panier. Quantité : ${target}.`
        : `Quantité maximale atteinte pour ${line.name}, ${line.volume}.`,
    );
    return { quantity: target, added, limited: before + requested > max };
  }, [announce, commit]);

  const updateQuantity = useCallback((slug: string, volume: string, quantity: number) => {
    const wanted = toInteger(quantity);
    if (wanted === null) return;
    const current = itemsRef.current;
    const line = current.find((item) => item.slug === slug && item.volume === volume);
    if (!line) return;
    const next = Math.max(1, Math.min(wanted, maxQuantityForStock(line.stock)));
    if (next === line.quantity) return;
    commit(current.map((item) => (item === line ? { ...item, quantity: next } : item)));
    announce(`${line.name}, ${line.volume} : quantité ${next}.`);
  }, [announce, commit]);

  const removeItem = useCallback((slug: string, volume: string) => {
    const current = itemsRef.current;
    const line = current.find((item) => item.slug === slug && item.volume === volume);
    if (!line) return;
    commit(current.filter((item) => item !== line));
    announce(`${line.name}, ${line.volume} retiré du panier.`);
  }, [announce, commit]);

  const clearCart = useCallback(() => commit([]), [commit]);

  const reconcile = useCallback((catalog: CatalogSnapshot[]) => {
    // Catalogue vide = base indisponible : on ne touche à rien, le serveur
    // revalidera de toute façon à la commande.
    if (!hydratedRef.current || catalog.length === 0) return [];
    const result = reconcileCartItems(itemsRef.current, catalog);
    if (result.changed) commit(result.items);
    return result.adjustments;
  }, [commit]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = items.length > 0 ? computeShipping(subtotal) : 0;
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: subtotal,
      subtotal,
      shipping,
      grandTotal: subtotal + shipping,
      hydrated,
      ready: hydrated,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      maxQuantityFor,
      reconcile,
    };
  }, [items, hydrated, isDrawerOpen, openDrawer, closeDrawer, addItem, updateQuantity, removeItem, clearCart, maxQuantityFor, reconcile]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer cart={value} />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-keep-active="">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  // Hors CartProvider (ex. composant monté ailleurs) : panier inerte plutôt
  // qu'un crash de la page.
  return useContext(CartContext) ?? INERT_CART;
}
