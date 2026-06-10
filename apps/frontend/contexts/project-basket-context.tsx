import React, { createContext, useContext, useState, useEffect } from "react";
import { useAccountType } from "@/contexts/account-type-context";
import {
  getCatalogBasketStorageKey,
  resolveCatalogIdentity,
} from "@/lib/catalog-access";

type BasketStoragePayload = {
  items: BasketItem[];
  projectId: string | null;
};

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
  projectId: string | null;
  /** Controls visibility of the basket side panel */
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  setProjectAssociation: (projectId: string | null) => void;
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

function readBasketState(storageKey: string): BasketStoragePayload {
  if (typeof window === "undefined") return { items: [], projectId: null };
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return { items: [], projectId: null };
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return { items: parsed as BasketItem[], projectId: null };
    }
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items as BasketItem[],
        projectId:
          parsed.projectId !== undefined && parsed.projectId !== null
            ? String(parsed.projectId)
            : null,
      };
    }
  } catch {}
  return { items: [], projectId: null };
}

function writeBasketState(storageKey: string, state: BasketStoragePayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectBasketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accountType } = useAccountType();
  const identity = resolveCatalogIdentity(accountType);
  const storageKey = getCatalogBasketStorageKey(identity);

  const initialState = readBasketState(storageKey);
  const [items, setItems] = useState<BasketItem[]>(initialState.items);
  const [projectId, setProjectId] = useState<string | null>(
    initialState.projectId,
  );
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const next = readBasketState(storageKey);
    setItems(next.items);
    setProjectId(next.projectId);
  }, [storageKey]);

  // Persist to localStorage on every change
  useEffect(() => {
    writeBasketState(storageKey, { items, projectId });
  }, [storageKey, items, projectId]);

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

  const setProjectAssociation = (nextProjectId: string | null) => {
    setProjectId(nextProjectId ? String(nextProjectId) : null);
  };

  const clearBasket = () => {
    setItems([]);
    setProjectId(null);
  };

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
        projectId,
        isOpen,
        setOpen,
        setProjectAssociation,
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
