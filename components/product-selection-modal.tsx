// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Star,
  Clock,
  Package,
  Check,
  X,
  Grid3x3,
  Grid2x2,
  LayoutGrid,
  ShoppingCart,
  Palette,
  Code,
  TrendingUp,
  Megaphone,
  Video,
  FileText,
  Plus,
} from "lucide-react"
import { useProducts } from "@/lib/contexts/product-context"

type GridLayout = 3 | 4 | 6

interface ProductSelectionModalProps {
  open: boolean
  onClose: () => void
  onAddProducts: (products: any[]) => void
  selectedProductIds?: string[]
}

export default function ProductSelectionModal({
  open,
  onClose,
  onAddProducts,
  selectedProductIds = [],
}: ProductSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [gridLayout, setGridLayout] = useState<GridLayout>(3)
  const [tempSelectedProducts, setTempSelectedProducts] = useState<any[]>([])
  const { products } = useProducts()

  const [customizationModal, setCustomizationModal] = useState(false)
  const [productToCustomize, setProductToCustomize] = useState<any>(null)
  const [selectedQuantity, setSelectedQuantity] = useState("1")
  const [selectedCreativeType, setSelectedCreativeType] = useState("estatica")
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])

  if (!open) return null

  const categoryIcons: Record<string, any> = {
    "Mídias e Conteúdo": Megaphone,
    "Design Gráfico": Palette,
    Desenvolvimento: Code,
    Marketing: TrendingUp,
    Conteúdo: FileText,
    Vídeo: Video,
  }

  const allCategories = Array.from(new Set(products.map((p) => p.category)))

  const categories = [
    {
      id: "all",
      name: "Todos",
      icon: ShoppingCart,
      count: products.filter((p) => p.isActive).length,
    },
    ...allCategories.map((cat) => ({
      id: cat.toLowerCase().replace(/\s+/g, "-"),
      name: cat,
      icon: categoryIcons[cat] || Package,
      count: products.filter((p) => p.category === cat && p.isActive).length,
    })),
  ]

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === "all" || product.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getGridClasses = () => {
    switch (gridLayout) {
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      case 6:
        return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    }
  }

  const toggleProductSelection = (product: any) => {
    const isSelected = tempSelectedProducts.some((p) => p.id === product.id)
    if (isSelected) {
      setTempSelectedProducts(tempSelectedProducts.filter((p) => p.id !== product.id))
    } else {
      setTempSelectedProducts([...tempSelectedProducts, product])
    }
  }

  const isProductSelected = (productId: string) => {
    return tempSelectedProducts.some((p) => p.id === productId) || selectedProductIds.includes(productId)
  }

  const handleAddAndReturn = () => {
    onAddProducts(tempSelectedProducts)
    setTempSelectedProducts([])
    onClose()
  }

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Package
  }

  const handleCustomizeProduct = (product: any) => {
    setProductToCustomize(product)
    setSelectedQuantity("1")
    setSelectedCreativeType("estatica")
    setSelectedExtras([])
    setCustomizationModal(true)
  }

  const calculateCustomTotal = () => {
    if (!productToCustomize) return 0

    let total = productToCustomize.finalPrice

    if (selectedQuantity === "2") total += 235.87
    if (selectedQuantity === "4") total += 471.74
    if (selectedQuantity === "8") total += 943.48

    if (selectedCreativeType === "carrossel") total += 50
    if (selectedCreativeType === "motion") total += 100

    if (selectedExtras.includes("expressa")) total += 75.5
    if (selectedExtras.includes("fonte")) total += 45
    if (selectedExtras.includes("revisoes")) total += 60

    return total
  }

  const toggleExtra = (extra: string) => {
    if (selectedExtras.includes(extra)) {
      setSelectedExtras((prev) => prev.filter((e) => e !== extra))
    } else {
      setSelectedExtras((prev) => [...prev, extra])
    }
  }

  const handleAddCustomizedProduct = () => {
    if (!productToCustomize) return

    const customizedProduct = {
      ...productToCustomize,
      quantity: Number.parseInt(selectedQuantity),
      customizations: {
        creativeType: selectedCreativeType,
        extras: selectedExtras,
      },
      finalPrice: calculateCustomTotal(),
    }

    toggleProductSelection(customizedProduct)
    setCustomizationModal(false)
    setProductToCustomize(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/20 pointer-events-none"></div>
      <div
        className="fixed right-0 top-0 h-full bg-white shadow-2xl overflow-y-auto pointer-events-auto"
        style={{
          width: "calc(100% - 240px)",
          left: "240px",
          zIndex: 60,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div>
            <h2 className="text-2xl font-bold">Selecionar Produtos</h2>
            <p className="text-purple-100 text-sm mt-1">Escolha os produtos para adicionar ao projeto</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">Grade:</span>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={gridLayout === 3 ? "default" : "ghost"}
                      className="h-8 w-8 p-0"
                      onClick={() => setGridLayout(3)}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={gridLayout === 4 ? "default" : "ghost"}
                      className="h-8 w-8 p-0"
                      onClick={() => setGridLayout(4)}
                    >
                      <Grid2x2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={gridLayout === 6 ? "default" : "ghost"}
                      className="h-8 w-8 p-0"
                      onClick={() => setGridLayout(6)}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent"
                    : "bg-white hover:bg-gray-50 border-gray-200"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`p-2 rounded-lg ${selectedCategory === category.id ? "bg-white/20" : "bg-blue-100"}`}
                    >
                      <category.icon
                        className={`h-5 w-5 ${selectedCategory === category.id ? "text-white" : "text-blue-600"}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-xs truncate">{category.name}</p>
                      <p
                        className={`text-xs ${selectedCategory === category.id ? "text-white/80" : "text-gray-500"}`}
                      >
                        {category.count} produtos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tempSelectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {tempSelectedProducts.length} produto(s) selecionado(s)
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTempSelectedProducts([])}
                className="text-blue-600 hover:text-blue-700"
              >
                Limpar seleção
              </Button>
            </div>
          )}

          <div className={`grid ${getGridClasses()} gap-4`}>
            {filteredProducts.map((product) => {
              const isSelected = isProductSelected(product.id)
              const CategoryIcon = getCategoryIcon(product.category)
              const isAlreadyAdded = selectedProductIds.includes(product.id)

              return (
                <Card
                  key={product.id}
                  className={`transition-all duration-200 cursor-pointer border-2 ${
                    isSelected
                      ? "border-green-500 bg-green-50 shadow-md"
                      : isAlreadyAdded
                        ? "border-gray-300 bg-gray-50 opacity-60"
                        : "border-gray-200 hover:shadow-md hover:border-blue-300"
                  }`}
                >
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 rounded-2xl">
                          <CategoryIcon className="h-16 w-16 text-blue-600" />
                        </div>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {isAlreadyAdded && (
                      <div className="absolute top-2 right-2 bg-gray-500 rounded-full px-2 py-1">
                        <span className="text-xs text-white font-medium">Adicionado</span>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm line-clamp-2 h-10">{product.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2 pb-3">
                    <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-yellow-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="font-medium text-gray-900">5.0</span>
                      </div>
                      {product.deliveryDays && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{product.deliveryDays}d</span>
                        </div>
                      )}
                    </div>

                    <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {formatCurrency(product.finalPrice)}
                    </p>

                    <div className="space-y-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCustomizeProduct(product)
                        }}
                        disabled={isAlreadyAdded}
                      >
                        <Palette className="h-3 w-3 mr-1" />
                        Personalizar
                      </Button>
                      <Button
                        size="sm"
                        className={`w-full text-xs ${
                          isSelected
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isAlreadyAdded) toggleProductSelection(product)
                        }}
                        disabled={isAlreadyAdded}
                      >
                        {isSelected ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Remover
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">Nenhum produto encontrado</div>
          )}
        </div>
      </div>
      <Dialog open={customizationModal} onOpenChange={setCustomizationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-70">
          <DialogHeader>
            <DialogTitle>Personalizar Produto</DialogTitle>
            <DialogDescription>{productToCustomize?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quantity Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quantidade de Criativos</Label>
              <RadioGroup value={selectedQuantity} onValueChange={setSelectedQuantity}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="1" id="qty-1" />
                  <Label htmlFor="qty-1" className="flex-1 cursor-pointer">
                    1 Criativo - {formatCurrency(productToCustomize?.finalPrice || 0)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="2" id="qty-2" />
                  <Label htmlFor="qty-2" className="flex-1 cursor-pointer">
                    2 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 235.87)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="4" id="qty-4" />
                  <Label htmlFor="qty-4" className="flex-1 cursor-pointer">
                    4 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 471.74)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="8" id="qty-8" />
                  <Label htmlFor="qty-8" className="flex-1 cursor-pointer">
                    8 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 943.48)}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Creative Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Criativo</Label>
              <RadioGroup value={selectedCreativeType} onValueChange={setSelectedCreativeType}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="estatica" id="type-static" />
                  <Label htmlFor="type-static" className="flex-1 cursor-pointer">
                    Criativo Estático - Incluído
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="carrossel" id="type-carousel" />
                  <Label htmlFor="type-carousel" className="flex-1 cursor-pointer">
                    Carrossel - +{formatCurrency(50)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="motion" id="type-motion" />
                  <Label htmlFor="type-motion" className="flex-1 cursor-pointer">
                    Motion/Vídeo - +{formatCurrency(100)}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Extras */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Extras Opcionais</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-express"
                    checked={selectedExtras.includes("expressa")}
                    onCheckedChange={() => toggleExtra("expressa")}
                  />
                  <Label htmlFor="extra-express" className="flex-1 cursor-pointer">
                    Entrega Expressa (48h) - +{formatCurrency(75.5)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-font"
                    checked={selectedExtras.includes("fonte")}
                    onCheckedChange={() => toggleExtra("fonte")}
                  />
                  <Label htmlFor="extra-font" className="flex-1 cursor-pointer">
                    Fonte Premium - +{formatCurrency(45)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-revisions"
                    checked={selectedExtras.includes("revisoes")}
                    onCheckedChange={() => toggleExtra("revisoes")}
                  />
                  <Label htmlFor="extra-revisions" className="flex-1 cursor-pointer">
                    Revisões Ilimitadas - +{formatCurrency(60)}
                  </Label>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatCurrency(calculateCustomTotal())}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCustomizationModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              onClick={handleAddCustomizedProduct}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao Projeto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
