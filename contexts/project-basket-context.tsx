import React, { createContext, useContext, useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  clearBasket: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
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
  const [items, setItems] = useState<BasketItem[]>([]);
  const [isOpen, setOpen] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("project-basket");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore malformed data
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem("project-basket", JSON.stringify(items));
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

  const clearBasket = () => setItems([]);

  const getTotalItems = () => items.reduce((s, i) => s + i.quantity, 0);
  const getTotalPrice = () =>
    items.reduce((s, i) => s + i.finalPrice * i.quantity, 0);

  return (
    <ProjectBasketContext.Provider
      value={{
        items,
        isOpen,
        setOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearBasket,
        getTotalItems,
        getTotalPrice,
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
