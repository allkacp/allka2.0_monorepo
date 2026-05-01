import React, { createContext, useContext, useState, useEffect } from "react";

const BASKET_KEY = "allka_catalog_cart";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BasketItemCommission {
  tipoComissao: "PERCENTUAL" | "VALOR_FIXO";
  /** Used when tipoComissao === "PERCENTUAL" */
  percentualComissao: number;
  /** Used when tipoComissao === "VALOR_FIXO" — value added per unit */
  valorComissao: number;
  /** Who pays at checkout */
  pagador: "AGENCIA" | "CLIENTE";
}

export interface BasketItem {
  /** Unique ID: `productId` for simple products, `productId--variationId` for variants */
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  productImage?: string;
  finalPrice: number;
  quantity: number;
  selectedVariation?: {
    id: string;
    name: string;
    priceModifier?: number;
  };
  /** Commission/margin set by the agency for this basket item */
  commissionData?: BasketItemCommission;
  /** Full product object — passed as-is to ProjectCreateSlidePanel */
  product: any;
}

interface ProjectBasketContextType {
  items: BasketItem[];
  /** Controls visibility of the basket side panel */
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  addItem: (product: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateCommission: (id: string, data: Partial<BasketItemCommission>) => void;
  clearBasket: () => void;
  getTotalItems: () => number;
  /** Sum of base prices (agency cost), ignoring commissions */
  getTotalPrice: () => number;
  /** Sum factoring in commissions per payer: client-pays items use client price, agency-pays items use base price */
  getClientTotal: () => number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectBasketContext = createContext<
  ProjectBasketContextType | undefined
>(undefined);

function makeItemId(productId: string, variationId?: string) {
  return variationId ? `${productId}--${variationId}` : productId;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectBasketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Synchronous lazy initializer — reads localStorage BEFORE the first render,
  // so the persist effect never sees a stale empty array on mount.
  const [items, setItems] = useState<BasketItem[]>(() => {
    try {
      const saved = localStorage.getItem(BASKET_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore malformed data
    }
    return [];
  });
  const [isOpen, setOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(BASKET_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: any) => {
    const variation = product.selectedVariation ?? null;
    const id = makeItemId(product.id, variation?.id);

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        // Same product+variation already in basket → increase quantity
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }

      const newItem: BasketItem = {
        id,
        productId: product.id,
        productName: variation
          ? `${product.name} — ${variation.name}`
          : (product.name ?? ""),
        productCategory: product.category ?? "",
        productImage:
          product.productImagePreview ??
          product.coverImage ??
          product.image ??
          "",
        finalPrice: product.finalPrice ?? product.basePrice ?? 0,
        quantity: 1,
        selectedVariation: variation
          ? {
              id: variation.id,
              name: variation.name,
              priceModifier: variation.priceModifier,
            }
          : undefined,
        product,
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    );
  };

  const updateCommission = (
    id: string,
    data: Partial<BasketItemCommission>,
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              commissionData: {
                tipoComissao: "PERCENTUAL",
                percentualComissao: 0,
                valorComissao: 0,
                pagador: "AGENCIA",
                ...(i.commissionData ?? {}),
                ...data,
              },
            }
          : i,
      ),
    );
  };

  const clearBasket = () => setItems([]);

  const getTotalItems = () => items.reduce((s, i) => s + i.quantity, 0);
  const getTotalPrice = () =>
    items.reduce((s, i) => s + i.finalPrice * i.quantity, 0);

  const getClientTotal = () =>
    items.reduce((s, i) => {
      const base = i.finalPrice * i.quantity;
      const c = i.commissionData;
      if (!c || c.pagador === "AGENCIA") return s + base;
      if (c.tipoComissao === "PERCENTUAL")
        return s + base + (base * c.percentualComissao) / 100;
      return s + base + c.valorComissao * i.quantity;
    }, 0);

  return (
    <ProjectBasketContext.Provider
      value={{
        items,
        isOpen,
        setOpen,
        addItem,
        removeItem,
        updateQuantity,
        updateCommission,
        clearBasket,
        getTotalItems,
        getTotalPrice,
        getClientTotal,
      }}
    >
      {children}
    </ProjectBasketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectBasket() {
  const ctx = useContext(ProjectBasketContext);
  if (!ctx)
    throw new Error(
      "useProjectBasket must be used within a ProjectBasketProvider",
    );
  return ctx;
}
