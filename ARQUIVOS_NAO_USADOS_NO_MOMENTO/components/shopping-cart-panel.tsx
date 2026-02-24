
import { useState } from "react"
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCart } from "@/contexts/cart-context"
import { useNavigate } from "react-router-dom"
import { CheckoutFlow, type CheckoutData } from "@/components/checkout-flow"

interface ShoppingCartPanelProps {
  open: boolean
  onClose: () => void
}

export function ShoppingCartPanel({ open, onClose }: ShoppingCartPanelProps) {
  const { items, updateQuantity, removeItem, clearCart, getTotalItems, getTotalPrice } = useCart()
  const navigate = useNavigate()
  const [checkoutMode, setCheckoutMode] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleAddMoreItems = () => {
    onClose()
    navigate("/in-house/catalogo")
  }

  const handleCheckout = () => {
    setCheckoutMode(true)
  }

  const handleCheckoutComplete = (data: CheckoutData) => {
    console.log("[v0] Checkout completed with data:", data)
    // TODO: Implement actual order submission logic here
    // For now, just show success and close
    alert("Compra finalizada com sucesso!")
    clearCart()
    setCheckoutMode(false)
    onClose()
  }

  const handleBackToCart = () => {
    setCheckoutMode(false)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[900px] max-w-[95vw] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {checkoutMode ? (
          <>
            {/* Checkout Flow Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Finalizar Compra</h2>
                    <p className="text-xs text-white/80">Complete os dados para finalizar</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <CheckoutFlow items={items} onBack={handleBackToCart} onComplete={handleCheckoutComplete} />
            </div>
          </>
        ) : (
          <>
            {/* Cart View Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Carrinho de Compras</h2>
                    <p className="text-xs text-white/80">
                      {getTotalItems()} {getTotalItems() === 1 ? "item" : "itens"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-white hover:bg-white/20 text-xs h-7"
                    >
                      Limpar Tudo
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Content */}
            <ScrollArea className="flex-1 p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <ShoppingBag className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Seu carrinho está vazio</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                    Adicione itens do catálogo para começar suas compras
                  </p>
                  <Button
                    onClick={handleAddMoreItems}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Explorar Catálogo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const basePrice = item.product.basePrice
                    const variationModifier = item.selectedVariation?.priceModifier || 1
                    const addonsPrice = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0
                    const itemUnitPrice = basePrice * variationModifier + addonsPrice
                    const itemTotalPrice = itemUnitPrice * item.quantity

                    console.log("[v0] Rendering cart item:", {
                      id: item.id,
                      product: item.product.name,
                      basePrice,
                      variationModifier,
                      addonsPrice,
                      itemUnitPrice,
                      quantity: item.quantity,
                      itemTotalPrice,
                    })

                    return (
                      <div
                        key={item.id}
                        className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <div className="flex gap-3">
                          {/* Product Image */}
                          <div className="relative w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.product.image ? (
                              <img
                                src={item.product.image || "/placeholder.svg"}
                                alt={item.product.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                                {item.product.name}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 ml-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">
                              {item.product.shortDescription}
                            </p>

                            {(item.selectedVariation || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                              <div className="mb-2 space-y-0.5">
                                {item.selectedVariation && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    • {item.selectedVariation.name}
                                  </p>
                                )}
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    {item.selectedAddons.map((addon) => (
                                      <p key={addon.id}>
                                        • {addon.name} (+{formatCurrency(addon.price)})
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              {/* Quantity Controls */}
                              <div className="flex items-center space-x-1 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-8 text-center dark:text-white">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(itemUnitPrice)} × {item.quantity}
                                </p>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(itemTotalPrice)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Cart Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 dark:border-slate-700 p-4 space-y-3 bg-white dark:bg-slate-900 flex-shrink-0">
                {/* Total */}
                <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-slate-700">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatCurrency(getTotalPrice())}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddMoreItems}
                    className="flex-1 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Adicionar Mais
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Finalizar Compra
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
