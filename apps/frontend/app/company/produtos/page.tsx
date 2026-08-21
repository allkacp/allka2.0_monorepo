"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageLoader } from "@/components/ui/loading";
import { ShoppingCart, X, Trash2, Minus, Plus, Package, PackageX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts, type Product } from "@/lib/contexts/product-context";
import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view";
import { ProductContractView } from "@/components/product-contract-view";
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { cn } from "@/lib/utils";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EmpresaProdutos() {
  const { products, loading, refetch } = useProducts();
  const basket = useProjectBasket();
  const navigate = useNavigate();
  const { produtoId } = useParams<{ produtoId?: string }>();
  const [cartOpen, setCartOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => { void refetch(); }, []);

  // Fecha cesta e painel ao navegar para outra tela
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setCartOpen(false);
    setPanelOpen(false);
  }, [pathname]);

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

  if (loading) {
    return <PageLoader text="Carregando catálogo…" />;
  }

  /* ── cart helpers ─────────────────────────────────────── */
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

  const cartTotal = selectedProducts.reduce(
    (sum, p) => sum + (p.finalPrice || 0) * (productQuantities[p.id] || 1),
    0,
  );
  const cartCount = selectedProducts.length;

  const handleContratar = () => {
    setCartOpen(false);
    setPanelOpen(true);
  };

  // ── Tela cheia de um produto (rota /company/produtos/:produtoId) ──
  // Substitui a listagem por completo — não é modal/painel sobre o catálogo.
  if (produtoId) {
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
              onClick={() => navigate("/company/produtos")}
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
        onBack={() => navigate("/company/produtos")}
      />
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
    <div className="h-full min-h-0 flex flex-col overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Package}
        title="Catálogo de Produtos"
        description="Explore os serviços disponíveis e contrate para seus projetos"
        actions={
          <>
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 h-8 px-3 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
              >
                <ShoppingCart className="h-4 w-4" />
                Carrinho
                <span className="ml-1 bg-white text-violet-700 rounded-full text-xs font-bold px-2 py-0.5">
                  {cartCount}
                </span>
              </button>
            )}
            <PinToTrayButton id="page-company-produtos" label="Produtos" icon={Package} path="/company/produtos" />
          </>
        }
      />
      </div>

      {/* Catalog */}
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

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Cart header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-violet-600" />
                <h2 className="font-semibold text-slate-900">
                  Carrinho ({cartCount})
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                  <Package className="h-8 w-8" />
                  <p className="text-sm">Nenhum produto selecionado</p>
                </div>
              ) : (
                selectedProducts.map((p) => {
                  const qty = productQuantities[p.id] || 1;
                  return (
                    <div
                      key={p.id}
                      className="flex items-start gap-3 bg-slate-50 rounded-xl p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtBRL(p.finalPrice || 0)} / unidade
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDecrease(p.id)}
                          className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-medium">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleIncrease(p.id)}
                          className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="ml-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart footer */}
            {selectedProducts.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total estimado</span>
                  <span className="font-bold text-slate-900 text-base">
                    {fmtBRL(cartTotal)}
                  </span>
                </div>
                <Button
                  onClick={handleContratar}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Contratar Serviços
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project creation panel — pre-fills with cart products */}
      <ProjectCreateNewPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        draftProducts={selectedProducts}
        draftProductQuantities={productQuantities}
        onCreate={() => {
          basket.clearBasket();
          setPanelOpen(false);
        }}
      />
    </div>
    </div>
    </div>
  );
}
