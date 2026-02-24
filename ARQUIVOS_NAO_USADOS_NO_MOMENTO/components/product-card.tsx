
import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Users, Clock, Eye, ShoppingCart, Check, Plus, Minus } from "lucide-react"
import type { Product } from "@/types/product"
import { useAccountType } from "@/contexts/account-type-context"
import { calculatePrice, formatPrice } from "@/lib/pricing"
import { useCart } from "@/contexts/cart-context"

interface ProductCardProps {
  product: Product
  viewMode: "grid" | "list"
  creditPlan?: number
}

export function ProductCard({ product, viewMode, creditPlan }: ProductCardProps) {
  const { accountType, accountSubType } = useAccountType()
  const [isHovered, setIsHovered] = useState(false)
  const { addItem, removeItem, updateQuantity, items } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const basePrice = calculatePrice(product.basePrice, accountType, accountSubType, creditPlan)
  const hasVariations = product.variations.length > 0
  const minPrice = hasVariations ? Math.min(...product.variations.map((v) => basePrice * v.priceModifier)) : basePrice

  const cartItem = items.find((item) => item.product.id === product.id)
  const isInCart = !!cartItem

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity + 1)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(product.id, cartItem.quantity - 1)
      } else {
        removeItem(product.id)
      }
    }
  }

  const complexityColors = {
    basic: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-orange-100 text-orange-800",
    premium: "bg-purple-100 text-purple-800",
  }

  if (viewMode === "list") {
    return (
      <Card className="mb-4 hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="w-full sm:w-64 h-56 sm:h-48 bg-gray-100 flex items-center justify-center shrink-0">
            <img
              src={product.image || `/placeholder.svg?height=224&width=256&query=${encodeURIComponent(product.name)}`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 p-4 sm:p-6 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl mb-1 line-clamp-2">{product.name}</CardTitle>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.shortDescription}</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-primary mb-1">
                  {hasVariations ? `a partir de ${formatPrice(minPrice)}` : formatPrice(basePrice)}
                </div>
                <Badge className={complexityColors[product.complexity]}>{product.complexity}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                <span>{product.stats.averageRating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{product.stats.contractCount} contratações</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{product.stats.completionTime}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {product.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {product.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{product.tags.length - 3}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {isInCart ? (
                <>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">No carrinho: {cartItem.quantity}x</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDecrement}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleIncrement}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  className={justAdded ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {justAdded ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Adicionado
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Adicionar ao Carrinho</span>
                      <span className="sm:hidden">Adicionar</span>
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ver Detalhes</span>
                <span className="sm:hidden">Detalhes</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-0">
        <div className="relative h-56 sm:h-64 bg-gray-100 rounded-t-lg overflow-hidden">
          <img
            src={product.image || `/placeholder.svg?height=256&width=384&query=${encodeURIComponent(product.name)}`}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge className={complexityColors[product.complexity]}>{product.complexity}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{product.name}</CardTitle>
        <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">{product.shortDescription}</p>

        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
            <span>{product.stats.averageRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{product.stats.contractCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {product.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{product.tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 sm:p-4 pt-0 mt-auto">
        <div className="w-full space-y-2">
          <div className="text-lg sm:text-xl font-bold text-primary truncate">
            {hasVariations ? `a partir de ${formatPrice(minPrice)}` : formatPrice(basePrice)}
          </div>

          {isInCart ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">No carrinho</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {cartItem.quantity}x
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={handleDecrement}>
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold">{cartItem.quantity}</span>
                </div>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={handleIncrement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className={`w-full ${justAdded ? "bg-green-600 hover:bg-green-700" : ""}`}
              size="sm"
              onClick={handleAddToCart}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionado ao Carrinho</span>
                  <span className="sm:hidden">Adicionado</span>
                </>
              ) : isHovered ? (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar ao Carrinho</span>
                  <span className="sm:hidden">Adicionar</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="sm:hidden">+</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
