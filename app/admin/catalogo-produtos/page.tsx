// @ts-nocheck
"use client";

import { useState } from "react";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { PageHeader } from "@/components/page-header";
import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view";
import { type Product } from "@/lib/contexts/product-context";

export default function AdminCatalogoProdutos() {
  const basket = useProjectBasket();

  const [selectedProducts, setSelectedProducts] = useState<
    CatalogSelectedProduct[]
  >([]);
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({});

  const handleAdd = (product: Product) => {
    basket.addItem(product);
    const exists = selectedProducts.find((p) => p.id === product.id);
    if (!exists) {
      setSelectedProducts((prev) => [
        ...prev,
        { ...product, quantity: 1, customizations: {} },
      ]);
      setProductQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    } else {
      handleIncrease(product.id);
    }
  };

  const handleRemove = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setProductQuantities((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleIncrease = (productId: string) => {
    const qty = productQuantities[productId] || 1;
    setProductQuantities((prev) => ({ ...prev, [productId]: qty + 1 }));
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: qty + 1 } : p)),
    );
  };

  const handleDecrease = (productId: string) => {
    const qty = productQuantities[productId] || 1;
    if (qty <= 1) {
      handleRemove(productId);
    } else {
      setProductQuantities((prev) => ({ ...prev, [productId]: qty - 1 }));
      setSelectedProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, quantity: qty - 1 } : p)),
      );
    }
  };

  return (
    <div className="flex-1 space-y-3">
      <PageHeader
        title="Catálogo de Produtos"
        description="Visualize os produtos ativos como os clientes os verão"
      />

      <ProductCatalogView
        mode="page"
        selectedProducts={selectedProducts}
        productQuantities={productQuantities}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
      />
    </div>
  );
}
