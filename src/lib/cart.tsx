"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { slug: string; name: string; image: string; volume: string; price: number; quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (slug: string, volume: string, quantity: number) => void;
  removeItem: (slug: string, volume: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("jae-cart");
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { window.localStorage.removeItem("jae-cart"); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("jae-cart", JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (next) => setItems((current) => {
      const existing = current.find((item) => item.slug === next.slug && item.volume === next.volume);
      return existing
        ? current.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...next, quantity: 1 }];
    }),
    updateQuantity: (slug, volume, quantity) => setItems((current) =>
      current.map((item) => item.slug === slug && item.volume === volume ? { ...item, quantity: Math.max(1, quantity) } : item)),
    removeItem: (slug, volume) => setItems((current) => current.filter((item) => item.slug !== slug || item.volume !== volume)),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
