"use client";

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectBasket } from "@/contexts/project-basket-context";
import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view";
import { ProductContractView } from "@/components/product-contract-view";
import { useProducts, type Product } from "@/lib/contexts/product-context";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { PageLoader } from "@/components/ui/loading";
import { Store, PackageX, ArrowLeft } from "lucide-react";

export default function AdminCatalogoProdutos() {
  const basket = useProjectBasket();
  const navigate = useNavigate();
  const { produtoId } = useParams<{ produtoId?: string }>();
  const { products, loading } = useProducts();

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

  // ── Tela cheia de um produto (rota /admin/catalogo-produtos/:produtoId) ──
  // Substitui a listagem por completo — não é modal/painel sobre o catálogo.
  if (produtoId) {
    if (loading) return <PageLoader text="Carregando produto…" />;

    const product = products.find((p) => String(p.id) === String(produtoId));
    if (!product) {
      return (
        <div className={STANDARD_SHELL_PANEL_CLASS}>
          <div className="h-full min-h-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <PackageX className="h-10 w-10 text-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-white">
                Produto não encontrado
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ele pode ter sido removido ou desativado do catálogo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/catalogo-produtos")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao catálogo
            </button>
          </div>
        </div>
      );
    }

    return (
      <ProductContractView
        product={product}
        isItemInBasket={(variationId) => {
          const itemId = variationId ? `${product.id}--${variationId}` : product.id;
          return basket.items.some((i) => i.id === itemId);
        }}
        onContratar={({ selectedVariation, finalPrice }) => {
          basket.addItem({
            ...product,
            selectedVariation: selectedVariation ?? undefined,
            finalPrice,
            ...(selectedVariation
              ? { name: `${product.name} — ${selectedVariation.name}` }
              : {}),
          });
        }}
        onBack={() => navigate("/admin/catalogo-produtos")}
      />
    );
  }

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
      />
      </div>
    </div>
    </div>
  );
}
