// @ts-nocheck
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProducts, type Product } from "@/lib/contexts/product-context"
import {
  Search,
  ShoppingCart,
  Star,
  Clock,
  Palette,
  Code,
  TrendingUp,
  Megaphone,
  Video,
  FileText,
  Package,
  Check,
  Minus,
  Plus,
  Grid3x3,
  Grid2x2,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type CatalogMode = "page" | "panel"

export interface CatalogSelectedProduct {
  id: string
  name: string
  description: string
  category: string
  finalPrice: number
  image?: string
  quantity: number
  customizations?: Record<string, any>
  [key: string]: any
}

interface ProductCatalogViewProps {
  mode?: CatalogMode
  selectedProducts?: CatalogSelectedProduct[]
  productQuantities?: Record<string, number>
  onAdd?: (product: Product) => void
  onRemove?: (productId: string) => void
  onIncrease?: (productId: string) => void
  onDecrease?: (productId: string) => void
  /** Called when user clicks "Ver Carrinho" sticky footer (panel mode only) */
  onConfirm?: () => void
  /** Show a different title in panel mode */
  panelTitle?: string
}

const CATEGORY_ICONS: Record<string, any> = {
  "Mídias e Conteúdo": Megaphone,
  "Design e Audiovisual": Palette,
  "Design Gráfico": Palette,
  Desenvolvimento: Code,
  "Desenvolvimento Web": Code,
  Marketing: TrendingUp,
  Conteúdo: FileText,
  Vídeo: Video,
}

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
]

function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function ProductCatalogView({
  mode = "page",
  selectedProducts = [],
  productQuantities = {},
  onAdd,
  onRemove,
  onIncrease,
  onDecrease,
  onConfirm,
  panelTitle = "Selecionar Produtos",
}: ProductCatalogViewProps) {
  const { products } = useProducts()

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")
  const [sort, setSort] = useState("name_asc")
  const [gridLayout, setGridLayout] = useState<3 | 4>(mode === "panel" ? 3 : 4)

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products])

  const allCategories = useMemo(
    () => Array.from(new Set(activeProducts.map((p) => p.category))),
    [activeProducts],
  )

  const categoryTabs = useMemo(
    () => [
      { id: "Todos", label: "Todos", count: activeProducts.length },
      ...allCategories.map((cat) => ({
        id: cat,
        label: cat,
        count: activeProducts.filter((p) => p.category === cat).length,
      })),
    ],
    [activeProducts, allCategories],
  )

  const filteredProducts = useMemo(() => {
    let list = activeProducts.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === "Todos" || p.category === category
      return matchesSearch && matchesCategory
    })

    list = [...list].sort((a, b) => {
      if (sort === "name_asc") return a.name.localeCompare(b.name)
      if (sort === "name_desc") return b.name.localeCompare(a.name)
      if (sort === "price_asc") return (a.finalPrice || 0) - (b.finalPrice || 0)
      if (sort === "price_desc") return (b.finalPrice || 0) - (a.finalPrice || 0)
      return 0
    })

    return list
  }, [activeProducts, search, category, sort])

  const totalSelected = selectedProducts.reduce((sum, p) => {
    const qty = productQuantities[p.id] || p.quantity || 1
    return sum + (p.finalPrice || 0) * qty
  }, 0)

  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || Package

  const isSelected = (productId: string) => !!selectedProducts.find((p) => p.id === productId)

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Ordenar"

  return (
    <div className={cn("flex flex-col h-full", mode === "page" && "min-h-0")}>
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className={cn("shrink-0 space-y-3", mode === "page" ? "px-6 py-4" : "px-4 py-3")}>
        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white border-slate-200 focus:border-blue-400 text-sm"
            />
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shrink-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentSortLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => setSort(o.value)}
                  className={cn("text-sm", sort === o.value && "font-medium text-blue-600")}
                >
                  {sort === o.value && <Check className="h-3.5 w-3.5 mr-2" />}
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Grid toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
            {([3, 4] as const).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={gridLayout === n ? "default" : "ghost"}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  gridLayout === n
                    ? "bg-white shadow-sm text-slate-900"
                    : "hover:bg-white/60 text-slate-500",
                )}
                onClick={() => setGridLayout(n)}
              >
                {n === 3 ? <Grid3x3 className="h-3.5 w-3.5" /> : <Grid2x2 className="h-3.5 w-3.5" />}
              </Button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {categoryTabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                category === id
                  ? "bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600",
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] leading-none rounded-full px-1 py-0.5",
                  category === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400",
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Products grid ───────────────────────────────────── */}
      <div className={cn("flex-1 overflow-y-auto min-h-0", mode === "page" ? "px-6 pb-6" : "px-4 pb-4")}>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1 opacity-70">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              gridLayout === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
            )}
          >
            {filteredProducts.map((product) => {
              const selected = isSelected(product.id)
              const qty = productQuantities[product.id] || 1
              const CategoryIcon = getCategoryIcon(product.category)
              const lineTotal = (product.finalPrice || 0) * (selected ? qty : 1)

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "border-0 shadow-sm hover:shadow-lg transition-all duration-200 group bg-white flex flex-col overflow-hidden cursor-default",
                    selected && "ring-2 ring-emerald-500 shadow-emerald-100",
                  )}
                >
                  {/* Image / Icon banner */}
                  <div className="relative h-44 bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <CategoryIcon className="h-12 w-12 text-blue-500" />
                        </div>
                      </div>
                    )}

                    {/* Category badge */}
                    <Badge className="absolute top-2 left-2 text-[10px] bg-white/90 text-slate-600 border-0 shadow-sm backdrop-blur-sm font-medium">
                      {product.category}
                    </Badge>

                    {selected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <CardContent className="flex flex-col flex-1 p-4 gap-3">
                    {/* Name + description */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="font-semibold text-slate-800">5.0</span>
                      </div>
                      {product.variations?.length > 0 && (
                        <span className="text-slate-400">
                          {product.variations.length} variação{product.variations.length !== 1 ? "ões" : ""}
                        </span>
                      )}
                      {product.addOns?.length > 0 && (
                        <div className="flex items-center gap-0.5 text-purple-400">
                          <Sparkles className="h-3 w-3" />
                          <span>{product.addOns.length} add-ons</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mt-auto pt-3 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                        A partir de
                      </p>
                      <p className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatCurrency(lineTotal)}
                      </p>

                      {/* Actions */}
                      <div className="mt-3 space-y-2">
                        {selected ? (
                          <>
                            {/* Qty controls */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onDecrease?.(product.id)}
                                className="flex-1 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-500 transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-slate-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => onIncrease?.(product.id)}
                                className="flex-1 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-500 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 bg-transparent"
                              onClick={() => onRemove?.(product.id)}
                            >
                              Remover do pedido
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full h-9 text-xs font-semibold bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm border-0"
                            onClick={() => onAdd?.(product)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Adicionar ao pedido
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Sticky footer (panel mode only) ─────────────────── */}
      {mode === "panel" && selectedProducts.length > 0 && onConfirm && (
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">
                {selectedProducts.length} produto{selectedProducts.length !== 1 ? "s" : ""} selecionado{selectedProducts.length !== 1 ? "s" : ""}
              </p>
              <p className="text-base font-bold text-slate-900">
                {formatCurrency(totalSelected)}
              </p>
            </div>
            <Button
              className="h-10 px-5 text-sm font-semibold bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-sm"
              onClick={onConfirm}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Carrinho ({selectedProducts.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
