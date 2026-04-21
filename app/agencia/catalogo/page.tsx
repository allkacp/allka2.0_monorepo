// @ts-nocheck
"use client"

import { useState } from "react"
import { ShoppingCart, Store, Sparkles, X, Trash2, Minus, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useProducts, type Product } from "@/lib/contexts/product-context"
import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view"
import { ProjectCreateSlidePanel } from "@/components/project-create-slide-panel"
import { cn } from "@/lib/utils"

function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export default function AgenciaCatalogo() {
  const { products } = useProducts()

  const [selectedProducts, setSelectedProducts] = useState<CatalogSelectedProduct[]>([])
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  /* ── cart helpers ─────────────────────────────────────── */
  const handleAdd = (product: Product) => {
    const exists = selectedProducts.find((p) => p.id === product.id)
    if (!exists) {
      setSelectedProducts((prev) => [...prev, { ...product, quantity: 1, customizations: {} }])
      setProductQuantities((prev) => ({ ...prev, [product.id]: 1 }))
    } else {
      handleIncrease(product.id)
    }
  }

  const handleRemove = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId))
    setProductQuantities((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const handleIncrease = (productId: string) => {
    const qty = productQuantities[productId] || 1
    setProductQuantities((prev) => ({ ...prev, [productId]: qty + 1 }))
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: qty + 1 } : p)),
    )
  }

  const handleDecrease = (productId: string) => {
    const qty = productQuantities[productId] || 1
    if (qty <= 1) {
      handleRemove(productId)
    } else {
      setProductQuantities((prev) => ({ ...prev, [productId]: qty - 1 }))
      setSelectedProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, quantity: qty - 1 } : p)),
      )
    }
  }

  const cartTotal = selectedProducts.reduce(
    (sum, p) => sum + (p.finalPrice || 0) * (productQuantities[p.id] || 1),
    0,
  )

  const cartCount = selectedProducts.length

  /* ── Contratar: open panel with pre-selected products ─── */
  const handleContratar = () => {
    setCartOpen(false)
    setPanelOpen(true)
  }

  const handlePanelSubmit = (project: any) => {
    // After project is created/submitted, clear cart
    setSelectedProducts([])
    setProductQuantities({})
    setPanelOpen(false)
  }

  const activeCount = products.filter((p) => p.isActive).length
  const categoryCount = new Set(products.filter((p) => p.isActive).map((p) => p.category)).size

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-transparent">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="shrink-0 bg-linear-to-r from-indigo-900 via-blue-900 to-purple-900 px-6 py-10 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-1/3 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-white/60 text-sm font-medium tracking-wide uppercase">
                Catálogo de Produtos
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
              Encontre o serviço ideal
              <br />
              <span className="text-blue-200">para o seu projeto</span>
            </h1>
            <p className="text-white/60 text-sm max-w-lg leading-relaxed">
              Explore nossa coleção completa de produtos e serviços. Selecione os que deseja, monte
              seu pedido e contrate com um clique.
            </p>

            {/* Stats chips */}
            <div className="flex items-center gap-3 mt-5">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-white text-xs font-medium">
                <Package className="h-3.5 w-3.5 text-blue-300" />
                {activeCount} produto{activeCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-white text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                {categoryCount} categori{categoryCount !== 1 ? "as" : "a"}
              </div>
            </div>
          </div>

          {/* Cart preview button (desktop) */}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="hidden md:flex shrink-0 items-center gap-3 bg-white rounded-2xl shadow-xl px-4 py-3 hover:shadow-2xl transition-shadow"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-4.5 h-4.5 flex items-center justify-center px-1">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500 leading-none">Meu pedido</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(cartTotal)}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── Catalog body ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
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

      {/* ── Floating cart button (mobile + when cart closed) ─ */}
      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl px-5 py-3 hover:shadow-purple-500/30 hover:shadow-2xl transition-all active:scale-95 md:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm font-bold">{formatCurrency(cartTotal)}</span>
          <Badge className="bg-white/20 text-white text-xs border-0 px-1.5">{cartCount}</Badge>
        </button>
      )}

      {/* ── Cart sidebar ─────────────────────────────────────── */}
      {/* Overlay */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300",
          cartOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Cart header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Meu Pedido</p>
              <p className="text-xs text-slate-400">
                {cartCount} produto{cartCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {selectedProducts.map((product) => {
            const qty = productQuantities[product.id] || 1
            return (
              <div
                key={product.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"
              >
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{product.category}</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {formatCurrency((product.finalPrice || 0) * qty)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => handleDecrease(product.id)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-slate-900">{qty}</span>
                    <button
                      type="button"
                      onClick={() => handleIncrease(product.id)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Cart footer */}
        <div className="shrink-0 border-t border-slate-100 p-5 space-y-4">
          {/* Order summary */}
          <div className="space-y-2">
            {selectedProducts.map((p) => {
              const qty = productQuantities[p.id] || 1
              return (
                <div key={p.id} className="flex justify-between text-xs text-slate-500">
                  <span className="truncate flex-1 pr-2">
                    {p.name} × {qty}
                  </span>
                  <span className="shrink-0 font-medium text-slate-700">
                    {formatCurrency((p.finalPrice || 0) * qty)}
                  </span>
                </div>
              )
            })}
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </div>

          <Button
            className="w-full h-11 text-sm font-bold bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md"
            onClick={handleContratar}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Contratar agora
          </Button>

          <button
            type="button"
            onClick={() => {
              setSelectedProducts([])
              setProductQuantities({})
            }}
            className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors text-center"
          >
            Limpar pedido
          </button>
        </div>
      </div>

      {/* ── Project create panel (pre-filled with cart) ──────── */}
      <ProjectCreateSlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSubmit={handlePanelSubmit}
        payerType="agency"
        initialProducts={selectedProducts}
        initialProductQuantities={productQuantities}
      />
    </div>
  )
}
