// @ts-nocheck
"use client";

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useProjectBasket } from "@/contexts/project-basket-context";
import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view";
import { type Product } from "@/lib/contexts/product-context";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { Store } from "lucide-react";

export default function AdminCatalogoProdutos() {
  const basket = useProjectBasket();
  const { produtoId: urlProdutoId } = useParams<{ produtoId?: string }>();

  // Derive from basket context — single source of truth
  const selectedProducts = useMemo<CatalogSelectedProduct[]>(
    () =>
      basket.items.map((item) => ({
        ...item.product,
        id: item.productId,
        finalPrice: item.finalPrice,
        quantity: item.quantity,
        customizations: {},
      })),
    [basket.items],
  );

  const productQuantities = useMemo<Record<string, number>>(
    () =>
      basket.items.reduce(
        (acc, item) => {
          acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [basket.items],
  );

  const handleAdd = (product: Product) => {
    basket.addItem(product);
  };

  const handleRemove = (productId: string) => {
    const item = basket.items.find((i) => i.productId === productId);
    if (item) basket.removeItem(item.id);
  };

  const handleIncrease = (productId: string) => {
    const item = basket.items.find((i) => i.productId === productId);
    if (item) basket.updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrease = (productId: string) => {
    const item = basket.items.find((i) => i.productId === productId);
    if (!item) return;
    basket.updateQuantity(item.id, item.quantity - 1);
  };

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Store}
        title="Catálogo de Produtos"
        description="Visualize os produtos ativos como os clientes os verão"
        actions={
          <PinToTrayButton id="page-catalogo-produtos" label="Catálogo de Produtos" icon={Store} path="/admin/catalogo-produtos" />
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-6">
      <ProductCatalogView
        mode="page"
        selectedProducts={selectedProducts}
        productQuantities={productQuantities}
        contractableOnly={true}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
        initialProductId={urlProdutoId}
      />
      </div>
    </div>
    </div>
  );
}
