// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  Search,
  Filter,
  Star,
  Clock,
  Palette,
  Code,
  TrendingUp,
  Megaphone,
  Video,
  FileText,
  ShoppingCart,
  Check,
  Plus,
  Minus,
  LayoutGrid,
  Grid3x3,
  Grid2x2,
  Package,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  Download,
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useProducts } from "@/lib/contexts/product-context"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type GridLayout = 3 | 4 | 6

export default function InHouseCatalogoPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { addItem, removeItem, updateQuantity, items } = useCart()
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const { products } = useProducts()
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // </CHANGE> Removed debug console.logs

  const [gridLayout, setGridLayout] = useState<GridLayout>(3)
  const [customizationModal, setCustomizationModal] = useState(false)
  const [productToCustomize, setProductToCustomize] = useState<any>(null)
  const [selectedQuantity, setSelectedQuantity] = useState("1")
  const [selectedCreativeType, setSelectedCreativeType] = useState("estatica")
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])

  useEffect(() => {
    const savedLayout = localStorage.getItem("catalogGridLayout")
    if (savedLayout && [3, 4, 6].includes(Number(savedLayout))) {
      setGridLayout(Number(savedLayout) as GridLayout)
    }
  }, [])

  const handleGridLayoutChange = (layout: GridLayout) => {
    setGridLayout(layout)
    localStorage.setItem("catalogGridLayout", layout.toString())
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

  const allCategories = Array.from(new Set(products.map((p) => p.category)))
  const categoryIcons: Record<string, any> = {
    "Mídias e Conteúdo": Megaphone,
    "Design Gráfico": Palette,
    Desenvolvimento: Code,
    Marketing: TrendingUp,
    Conteúdo: FileText,
    Vídeo: Video,
  }

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

  const handleAddToCart = (product: any) => {
    const customization = {
      variation: {
        id: `quantity-${selectedQuantity}`,
        name: `${selectedQuantity} Criativo${selectedQuantity !== "1" ? "s" : ""} + ${selectedQuantity} Copy${selectedQuantity !== "1" ? "s" : ""}`,
        priceModifier: 1, // Base price already calculated
      },
      addons: [
        ...(selectedCreativeType !== "estatica"
          ? [
              {
                id: `creative-${selectedCreativeType}`,
                name:
                  selectedCreativeType === "carrossel"
                    ? "Carrossel"
                    : selectedCreativeType === "motion"
                      ? "Motion"
                      : "",
                price: selectedCreativeType === "carrossel" ? 50.0 : selectedCreativeType === "motion" ? 100.0 : 0,
              },
            ]
          : []),
        ...(selectedExtras.includes("expressa")
          ? [{ id: "extra-expressa", name: "Entrega Expressa (24h)", price: 75.5 }]
          : []),
        ...(selectedExtras.includes("fonte") ? [{ id: "extra-fonte", name: "Arquivos Fonte", price: 45.0 }] : []),
        ...(selectedExtras.includes("revisoes")
          ? [{ id: "extra-revisoes", name: "Revisões Ilimitadas", price: 60.0 }]
          : []),
      ],
    }

    // Calculate quantity price difference
    let quantityPrice = product.finalPrice
    if (selectedQuantity === "2") quantityPrice += 235.87
    if (selectedQuantity === "4") quantityPrice += 471.74
    if (selectedQuantity === "8") quantityPrice += 943.48

    // Update product with customized price
    const customizedProduct = {
      ...product,
      basePrice: quantityPrice, // Set basePrice to include quantity selection
    }

    const cartProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      shortDescription: product.description,
      category: product.category,
      tags: product.tags || [],
      basePrice: quantityPrice,
      complexity: "intermediate" as const,
      visibility: { company: true, agency: true, partner: true, inHouse: true },
      variations: [],
      addons: [],
      stats: {
        contractCount: 0,
        averageRating: 5.0,
        completionTime: product.deliveryDays ? `${product.deliveryDays} dias` : "A combinar",
      },
      demonstrations: [],
      image: product.image || "",
    }

    addItem(cartProduct, 1, customization)
    setJustAdded(product.id)
    setTimeout(() => setJustAdded(null), 2000)
  }

  const getCartItem = (productId: string) => {
    return items.find((item) => item.product.id === productId)
  }

  const handleIncrement = (product: any) => {
    const cartItem = getCartItem(product.id)
    if (cartItem) {
      updateQuantity(cartItem.product.id, cartItem.quantity + 1)
    }
  }

  const handleDecrement = (product: any) => {
    const cartItem = getCartItem(product.id)
    if (cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(cartItem.product.id, cartItem.quantity - 1)
      } else {
        removeItem(cartItem.product.id)
      }
    }
  }

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Package
  }

  const handleNextImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setSelectedImageIndex((prev) => (prev + 1) % (selectedProduct.images.length + 1))
    }
  }

  const handlePrevImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setSelectedImageIndex(
        (prev) => (prev - 1 + (selectedProduct.images.length + 1)) % (selectedProduct.images.length + 1),
      )
    }
  }

  const getCurrentImage = () => {
    if (!selectedProduct) return null
    if (selectedImageIndex === 0) return selectedProduct.image
    return selectedProduct.images?.[selectedImageIndex - 1]
  }

  const allImages = selectedProduct ? [selectedProduct.image, ...(selectedProduct.images || [])] : []

  const handleOpenCustomization = (product: any) => {
    setProductToCustomize(product)
    setSelectedQuantity("1")
    setSelectedCreativeType("estatica")
    setSelectedExtras([])
    setCustomizationModal(true)
    if (selectedProduct) {
      setSelectedProduct(null)
    }
  }

  const calculateCustomTotal = () => {
    if (!productToCustomize) return 0

    let total = productToCustomize.finalPrice

    // Adicionar custo por quantidade
    if (selectedQuantity === "2") total += 235.87
    if (selectedQuantity === "4") total += 471.74
    if (selectedQuantity === "8") total += 943.48

    // Adicionar custo por tipo de criativo
    if (selectedCreativeType === "carrossel") total += 50.0
    if (selectedCreativeType === "motion") total += 100.0

    // Adicionar custos de extras
    if (selectedExtras.includes("expressa")) total += 75.5
    if (selectedExtras.includes("fonte")) total += 45.0
    if (selectedExtras.includes("revisoes")) total += 60.0

    return total
  }

  const toggleExtra = (extra: string) => {
    setSelectedExtras((prev) => (prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]))
  }

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="max-w-7xl mx-auto space-y-3">
        <PageHeader
          title="Catálogo de Serviços"
          description="Contrate especialistas para serviços pontuais de alta qualidade"
          actions={
            <Badge variant="outline" className="text-sm bg-white">
              {filteredProducts.length} serviços disponíveis
            </Badge>
          }
        />

        <div className="space-y-6">
          {/* Search and Filter */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar serviços..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-gray-600 hidden sm:inline">Visualização:</span>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={gridLayout === 3 ? "default" : "ghost"}
                      className={`h-8 w-8 p-0 ${
                        gridLayout === 3 ? "bg-white shadow-sm hover:bg-white" : "hover:bg-white/50"
                      }`}
                      onClick={() => handleGridLayoutChange(3)}
                      title="3 colunas"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={gridLayout === 4 ? "default" : "ghost"}
                      className={`h-8 w-8 p-0 ${
                        gridLayout === 4 ? "bg-white shadow-sm hover:bg-white" : "hover:bg-white/50"
                      }`}
                      onClick={() => handleGridLayoutChange(4)}
                      title="4 colunas"
                    >
                      <Grid2x2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={gridLayout === 6 ? "default" : "ghost"}
                      className={`h-8 w-8 p-0 ${
                        gridLayout === 6 ? "bg-white shadow-sm hover:bg-white" : "hover:bg-white/50"
                      }`}
                      onClick={() => handleGridLayoutChange(6)}
                      title="6 colunas"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="bg-white hover:bg-gray-50 shrink-0">
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Filtros Avançados</span>
                  <span className="sm:hidden">Filtros</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`border-0 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-white hover:bg-gray-50"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`p-2 sm:p-3 rounded-lg ${selectedCategory === category.id ? "bg-white/20" : "bg-blue-100"}`}
                    >
                      <category.icon
                        className={`h-5 w-5 sm:h-6 sm:w-6 ${selectedCategory === category.id ? "text-white" : "text-blue-600"}`}
                      />
                    </div>
                    <div className="w-full">
                      <p className="font-medium text-xs sm:text-sm truncate">{category.name}</p>
                      <p className={`text-xs ${selectedCategory === category.id ? "text-white/80" : "text-gray-500"}`}>
                        {category.count} serviços
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className={`grid ${getGridClasses()} gap-4 sm:gap-6 transition-all duration-300`}>
            {filteredProducts.map((product) => {
              const cartItem = getCartItem(product.id)
              const isInCart = !!cartItem
              const CategoryIcon = getCategoryIcon(product.category)

              return (
                <Card
                  key={product.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group bg-white flex flex-col overflow-hidden"
                >
                  <div className="relative h-56 sm:h-64 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 sm:p-12 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                          <CategoryIcon className="h-16 w-16 sm:h-20 sm:w-20 text-blue-600" />
                        </div>
                      </div>
                    )}
                    {product.recurrence && (
                      <Badge className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs">
                        {product.recurrence}
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
                      {product.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
                      <div className="flex items-center space-x-1 text-yellow-500">
                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                        <span className="font-medium text-gray-900">5.0</span>
                        <span className="text-gray-500">(novo)</span>
                      </div>
                      {product.deliveryDays && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="whitespace-nowrap">{product.deliveryDays} dias</span>
                        </div>
                      )}
                    </div>

                    {product.tasks && product.tasks.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Package className="h-3.5 w-3.5" />
                        <span>{product.tasks.length} tarefas incluídas</span>
                      </div>
                    )}

                    <div className="pt-3 border-t mt-auto space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 bg-transparent"
                        onClick={() => {
                          setSelectedProduct(product)
                          setSelectedImageIndex(0)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>

                      <div className="flex items-end justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Preço final</p>
                          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                            {formatCurrency(product.finalPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300"
                          onClick={() => handleOpenCustomization(product)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Personalizar
                        </Button>

                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          onClick={() => {
                            const defaultCustomization = {
                              variation: {
                                id: "quantity-1",
                                name: "1 Criativo + 1 Copy",
                                priceModifier: 1,
                              },
                              addons: [],
                            }

                            const cartProduct = {
                              id: product.id,
                              name: product.name,
                              description: product.description,
                              shortDescription: product.description,
                              category: product.category,
                              tags: product.tags || [],
                              basePrice: product.finalPrice,
                              complexity: "intermediate" as const,
                              visibility: { company: true, agency: true, partner: true, inHouse: true },
                              variations: [],
                              addons: [],
                              stats: {
                                contractCount: 0,
                                averageRating: 5.0,
                                completionTime: product.deliveryDays ? `${product.deliveryDays} dias` : "A combinar",
                              },
                              demonstrations: [],
                              image: product.image || "",
                            }

                            addItem(cartProduct, 1, defaultCustomization)
                            setJustAdded(product.id)
                            setTimeout(() => setJustAdded(null), 2000)
                          }}
                        >
                          {justAdded === product.id ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Adicionado
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Adicionar ao Carrinho
                            </>
                          )}
                        </Button>
                      </div>

                      {isInCart && (
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 bg-transparent"
                              onClick={() => handleDecrement(product)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 text-center">
                              <span className="text-lg font-bold">{cartItem.quantity}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200 bg-transparent"
                              onClick={() => handleIncrement(product)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="text-center py-8 sm:py-12">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum serviço encontrado"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {products.length === 0
                      ? "Cadastre produtos em Gestão de Produtos para vê-los aqui."
                      : "Tente ajustar seus filtros ou termo de busca."}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedCategory("all")
                    }}
                    className="bg-white hover:bg-gray-50"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl left-[240px] p-0 flex flex-col h-full overflow-hidden"
        >
          {selectedProduct && (
            <>
              {/* Header compacto com gradiente */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white px-4 py-4 shrink-0">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {/* Imagem principal grande */}
                    <div className="w-32 h-32 bg-white rounded-lg overflow-hidden border-2 border-white/20 shadow-lg mb-2">
                      {getCurrentImage() ? (
                        <img
                          src={getCurrentImage() || "/placeholder.svg"}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                          <Package className="h-16 w-16 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Miniaturas do carrossel */}
                    {allImages.length > 1 && (
                      <div className="flex gap-1 overflow-x-auto max-w-[128px]">
                        {allImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`w-8 h-8 rounded border-2 overflow-hidden shrink-0 transition-all ${
                              idx === selectedImageIndex
                                ? "border-white scale-110"
                                : "border-white/30 opacity-60 hover:opacity-100"
                            }`}
                          >
                            {img ? (
                              <img
                                src={img || "/placeholder.svg"}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Package className="h-3 w-3 text-gray-400" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Controles de navegação */}
                    {allImages.length > 1 && (
                      <div className="absolute top-14 left-0 right-0 flex justify-between px-1">
                        <button
                          onClick={handlePrevImage}
                          className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleNextImage}
                          className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Product Info - Compacto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0 flex items-start gap-2">
                        <div className="flex-1">
                          <SheetTitle className="text-lg font-bold text-white mb-1 line-clamp-1">
                            {selectedProduct.name}
                          </SheetTitle>
                          <div className="flex items-center gap-2 text-xs text-blue-100 mb-1">
                            <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-0">
                              {selectedProduct.category}
                            </Badge>
                            <span className="text-blue-100">233 Contratações</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-white font-medium ml-1 text-xs">5.0 (27 avaliações)</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-white hover:bg-white/20 h-8 w-8">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => setSelectedProduct(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Product Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-100">Valor:</p>
                          <p className="text-sm text-gray-300 line-through">de R$ 310,00</p>
                          <p className="text-2xl font-bold text-white">
                            a partir de {formatCurrency(selectedProduct.finalPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-100">Prazo de entrega:</p>
                          <p className="text-lg font-bold">{selectedProduct.deliveryDays || 2} Dias úteis</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1 border-white/30 text-white hover:bg-white/20 text-xs bg-transparent"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Baixar modelo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs - Estilo moderno sem borda */}
              <div className="flex-1 overflow-auto bg-slate-50">
                <Tabs defaultValue="apresentacao" className="w-full">
                  <div className="bg-white sticky top-0 z-10 shadow-sm">
                    <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-0 grid grid-cols-4">
                      <TabsTrigger
                        value="apresentacao"
                        className="relative rounded-none border-0 py-3 px-2 text-xs font-medium data-[state=inactive]:text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600 transition-all"
                      >
                        Apresentação
                      </TabsTrigger>
                      <TabsTrigger
                        value="descricao"
                        className="relative rounded-none border-0 py-3 px-2 text-xs font-medium data-[state=inactive]:text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600 transition-all"
                      >
                        Descrição
                      </TabsTrigger>
                      <TabsTrigger
                        value="prazos"
                        className="relative rounded-none border-0 py-3 px-2 text-xs font-medium data-[state=inactive]:text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600 transition-all"
                      >
                        Prazos
                      </TabsTrigger>
                      <TabsTrigger
                        value="solicitar"
                        className="relative rounded-none border-0 py-3 px-2 text-xs font-medium data-[state=inactive]:text-gray-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600 transition-all"
                      >
                        Como solicitar?
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-4">
                    {/* Apresentação Tab */}
                    <TabsContent value="apresentacao" className="mt-0 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Left: Presentation Text */}
                        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                          <h3 className="font-bold text-sm text-gray-900">Apresentação</h3>
                          <div className="text-xs text-gray-700 space-y-2 leading-relaxed">
                            <p>
                              • Uma pauta de conteúdo é um documento ou plano que contém uma lista organizada de
                              tópicos, temas ou ideias para serem desenvolvidos em futuras postagens de blog ou
                              publicações nas redes sociais.
                            </p>
                            <p>
                              • Além disso, toda empresa necessita de postagens envolventes. Pautas dinâmicas e
                              criativas possibilitam uma relação mais forte entre a marca e o cliente.
                            </p>
                            <p>
                              • A criação de pautas para as redes sociais, blogs e sites exige experiência, afinal, há
                              uma série de técnicas que devem ser respeitadas para atingir os objetivos de comunicação.
                            </p>
                          </div>
                        </div>

                        {/* Right: Video */}
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4 text-white space-y-3">
                          <h3 className="font-bold text-sm">Veja o vídeo de entrega do produto:</h3>
                          {selectedProduct.videoUrl ? (
                            <div className="aspect-video rounded-md overflow-hidden bg-black">
                              <iframe
                                src={selectedProduct.videoUrl}
                                className="w-full h-full"
                                allowFullScreen
                                title="Product video"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video rounded-md overflow-hidden bg-black flex items-center justify-center">
                              <Video className="h-12 w-12 text-white/50" />
                            </div>
                          )}
                          <Button size="sm" className="w-full bg-white text-blue-600 hover:bg-blue-50 text-xs">
                            <FileText className="h-3 w-3 mr-2" />
                            BAIXAR MODELO DE ENTREGA
                          </Button>
                        </div>
                      </div>

                      {/* Included / Not Included */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-teal-900">Itens inclusos:</h3>
                          <ul className="space-y-1 text-teal-800 text-xs">
                            <li>• Criação de 20 pautas</li>
                            <li>• Planejamento de conteúdo</li>
                            <li>• Pesquisa de pautas e horários</li>
                            <li>• Arquivo .ppt editável</li>
                          </ul>
                        </div>

                        <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-pink-900">Itens não inclusos:</h3>
                          <ul className="space-y-1 text-pink-800 text-xs">
                            <li>• Postagem no blog e/ou redes sociais</li>
                            <li>• Análise de desempenho</li>
                            <li>• Design e/ou criação de elementos visuais</li>
                            <li>• Criação de conteúdo e criativo</li>
                          </ul>
                        </div>
                      </div>

                      {/* Attention Section */}
                      <div className="bg-red-600 rounded-lg p-4 text-white space-y-2">
                        <h3 className="font-bold text-base">ATENÇÃO!!!</h3>
                        <ol className="space-y-1.5 text-xs">
                          <li>
                            1. Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.
                          </li>
                          <li>
                            2. Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os
                            termos da Lei Federal Nº9.610/98 (Lei de Direito Autorais).
                          </li>
                        </ol>
                      </div>
                    </TabsContent>

                    {/* Descrição Tab */}
                    <TabsContent value="descricao" className="mt-0 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Benefits */}
                        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                          <h3 className="font-bold text-sm text-gray-900">Benefícios</h3>
                          <div className="text-xs text-gray-700 space-y-2 leading-relaxed">
                            <p>
                              • Essa pauta serve como um guia estratégico para a criação de conteúdo consistente e
                              relevante.
                            </p>
                            <p>
                              • Além disso, toda empresa necessita de postagens envolventes. Pautas dinâmicas e
                              criativas possibilitam uma relação mais forte entre a marca e o cliente.
                            </p>
                            <p>
                              • O cliente deverá apresentar o negócio detalhadamente e o projeto de marketing para que o
                              redator consiga idealizar os temas.
                            </p>
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4 text-white space-y-3">
                          <h3 className="font-bold text-sm">Informações</h3>
                          <div className="text-xs space-y-2 leading-relaxed">
                            <p>
                              • O cliente deverá apresentar o negócio detalhadamente e o projeto de marketing para que o
                              redator consiga idealizar os temas.
                            </p>
                            <p>
                              • Mediante as informações apresentadas, caberá a Allka criar uma tabela com 20 temas
                              sugeridos.
                            </p>
                            <p>
                              • O arquivo será entregue em .ppt e não contempla a criação do conteúdo e nenhum criativo.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attention Sections - Compacto */}
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-gray-900">Texto de atenção</h3>
                          <div className="text-xs text-gray-700 space-y-1.5">
                            <p>
                              1. Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.
                            </p>
                            <p>
                              2. Todos os elementos devem respeitar os termos da Lei Federal Nº9.610/98 (Lei de Direito
                              Autorais).
                            </p>
                          </div>
                        </div>

                        <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-gray-900">Descrição Resumida (Proposta)</h3>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            A elaboração de pautas de conteúdo é essencial para organizar ideias de forma estruturada e
                            alinhar as postagens com os objetivos da empresa, garantindo consistência e diversidade no
                            conteúdo das redes sociais e blogs.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Prazos Tab */}
                    <TabsContent value="prazos" className="mt-0 space-y-4">
                      {/* Prazos e processos */}
                      <div className="bg-white rounded-lg p-4 border-2 border-blue-200 space-y-4">
                        <h3 className="font-bold text-base text-blue-600">Prazos e processos:</h3>

                        <div className="relative">
                          {/* Process Flow - Compacto */}
                          <div className="flex items-start gap-4">
                            {/* Step 1: Execução */}
                            <div className="flex-1">
                              <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 border-2 border-blue-600">
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                  1
                                </div>
                                <div className="text-center space-y-2">
                                  <div className="flex justify-center">
                                    <div className="bg-white rounded-full p-2">
                                      <Package className="h-8 w-8 text-blue-600" />
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs text-gray-900 mb-1">Execução</h4>
                                    <p className="font-semibold text-xs text-gray-900">
                                      Pauta de Conteúdo com 20 temas
                                    </p>
                                    <p className="text-blue-700 font-medium text-xs mt-1">Prazo: até 4 dias úteis</p>
                                    <p className="text-gray-700 text-[10px]">(nômade designado)</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center justify-center pt-12">
                              <ChevronRight className="h-8 w-8 text-blue-600" />
                            </div>

                            {/* Step 2: Aprovação */}
                            <div className="flex-1">
                              <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 border-2 border-blue-600">
                                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                  2
                                </div>
                                <div className="text-center space-y-2">
                                  <div className="flex justify-center">
                                    <div className="bg-white rounded-full p-2">
                                      <Check className="h-8 w-8 text-blue-600" />
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs text-gray-900 mb-1">Aprovação</h4>
                                    <p className="font-semibold text-xs text-gray-900">
                                      Pauta de Conteúdo com 20 temas
                                    </p>
                                    <p className="text-blue-700 font-medium text-xs mt-1">Prazo: até 10 dias úteis</p>
                                    <p className="text-gray-700 text-[10px]">(cliente solicitante)</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-100 rounded-lg p-3 border-2 border-blue-300">
                          <p className="text-blue-900 font-semibold text-center text-xs">
                            Total de Dias (considerando 1 dia de Aprovação) = 5 dias úteis
                          </p>
                        </div>
                      </div>

                      {/* Contratações */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-200 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-gray-900">Contratação Avulsa:</h3>
                          <p className="text-xs text-gray-800">
                            • O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é
                            considerada "expirada".
                          </p>
                        </div>

                        <div className="bg-gray-300 rounded-lg p-4 space-y-2">
                          <h3 className="font-bold text-sm text-gray-900">Contratação Mensal:</h3>
                          <p className="text-xs text-gray-800">
                            • A tarefa fica disponível a cada 30 dias e pode ser utilizada até a abertura da próxima.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Como solicitar Tab */}
                    <TabsContent value="solicitar" className="mt-0 space-y-4">
                      {/* Briefing Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
                        <h3 className="font-bold text-base mb-1">Briefing</h3>
                        <p className="text-blue-100 text-xs">
                          *O questionário abaixo ficará disponível após contratação e será obrigatório para o envio da
                          tarefa para execução.
                        </p>
                      </div>

                      {/* Questions */}
                      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                        {selectedProduct.questionnaire && selectedProduct.questionnaire.length > 0 ? (
                          selectedProduct.questionnaire.map((q: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">
                                {idx + 1}ª {q.question}
                              </p>
                              {q.exampleAnswer && (
                                <p className="text-gray-700 text-xs">
                                  <span className="font-medium">Ex:</span> {q.exampleAnswer}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">1ª Qual objetivo dessas pautas?</p>
                              <p className="text-gray-700 text-xs">
                                Ex: Criar fidelidade e atrair novos seguidores e futuros clientes
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">2ª O que deve ser abordado?</p>
                              <p className="text-gray-700 text-xs">Ex: Temas para minha agência de marketing digital</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">3ª Onde os temas serão aplicados?</p>
                              <p className="text-gray-700 text-xs">Ex: No insta da empresa</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">
                                4ª Quais links úteis para conhecermos o negócio?
                              </p>
                              <p className="text-gray-700 text-xs">Ex: Quero todas as pautas pro meu instagram</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">5ª Qual seu empresa e atuação?</p>
                              <p className="text-gray-700 text-xs">
                                Ex: Agência de marketing digital, atuo em São Paulo
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">6ª Qual seu Público-alvo?</p>
                              <p className="text-gray-700 text-xs">Ex: Empresas de médio e pequeno porte</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">
                                7ª Tem dias e horários específicos para publicação?
                              </p>
                              <p className="text-gray-700 text-xs">
                                Ex: Não gosto de postagem às segundas. No mais, o profissional pode escolher.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">8ª Quem são seus concorrentes?</p>
                              <p className="text-gray-700 text-xs">Ex: Agência Tal (link do site e insta)</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-blue-700 font-semibold text-xs">9ª Tem mais alguma observação?</p>
                              <p className="text-gray-700 text-xs">Ex: Não precisa se fixar em datas comemorativas</p>
                            </div>
                            <div>
                              <p className="text-blue-700 font-semibold text-xs">
                                10ª Caso tenha, anexar arquivos ou pautas anteriores.
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Attention Section */}
                      <div className="bg-red-600 rounded-lg p-4 text-white space-y-2">
                        <h3 className="font-bold text-base">ATENÇÃO!!!</h3>
                        <ol className="space-y-1.5 text-xs">
                          <li>
                            1. Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.
                          </li>
                          <li>
                            2. Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os
                            termos da Lei Federal Nº9.610/98.
                          </li>
                        </ol>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Footer - Compacto */}
              <div className="bg-white border-t px-4 py-3 flex items-center justify-between gap-4 shrink-0">
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Preço total</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatCurrency(selectedProduct.finalPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    onClick={() => {
                      const defaultCustomization = {
                        variation: {
                          id: "quantity-1",
                          name: "1 Criativo + 1 Copy",
                          priceModifier: 1,
                        },
                        addons: [],
                      }

                      const cartProduct = {
                        id: selectedProduct.id,
                        name: selectedProduct.name,
                        description: selectedProduct.description,
                        shortDescription: selectedProduct.description,
                        category: selectedProduct.category,
                        tags: selectedProduct.tags || [],
                        basePrice: selectedProduct.finalPrice,
                        complexity: "intermediate" as const,
                        visibility: { company: true, agency: true, partner: true, inHouse: true },
                        variations: [],
                        addons: [],
                        stats: {
                          contractCount: 0,
                          averageRating: 5.0,
                          completionTime: selectedProduct.deliveryDays
                            ? `${selectedProduct.deliveryDays} dias`
                            : "A combinar",
                        },
                        demonstrations: [],
                        image: selectedProduct.image || "",
                      }

                      addItem(cartProduct, 1, defaultCustomization)
                      setJustAdded(selectedProduct.id)
                      setTimeout(() => setJustAdded(null), 2000)
                      setSelectedProduct(null)
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300"
                    onClick={() => handleOpenCustomization(selectedProduct)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Personalizar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={customizationModal} onOpenChange={setCustomizationModal}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
          {productToCustomize && (
            <>
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white px-6 py-4 shrink-0">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 shrink-0 bg-white rounded-lg overflow-hidden shadow-lg">
                    {productToCustomize.image ? (
                      <img
                        src={productToCustomize.image || "/placeholder.svg"}
                        alt={productToCustomize.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                        <Package className="h-10 w-10 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold text-white mb-1 line-clamp-2">
                      {productToCustomize.name}
                    </SheetTitle>
                    <p className="text-sm text-blue-100 mb-2">{productToCustomize.category} | 233 Contratações</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-white font-medium ml-1 text-xs">5.0</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-white hover:bg-white/20 h-8 w-8"
                    onClick={() => setCustomizationModal(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div>
                    <p className="text-xs text-blue-100">Valor</p>
                    <p className="text-sm text-white/70 line-through">de R$ 310,00</p>
                    <p className="text-xl font-bold text-white">
                      a partir de {formatCurrency(productToCustomize.finalPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-100">Prazo de entrega:</p>
                    <p className="text-lg font-bold text-white">{productToCustomize.deliveryDays || 2} Dias úteis</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 border-white/30 text-white hover:bg-white/20 text-xs bg-transparent"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Baixar modelo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Escolha as opções:</h3>

                  {/* Quantidade */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-900">Quantidade</Label>
                    <RadioGroup value={selectedQuantity} onValueChange={setSelectedQuantity} className="space-y-2">
                      <div className="flex items-center justify-between p-4 border-2 border-blue-500 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="1" id="q1" className="border-blue-600" />
                          <Label htmlFor="q1" className="font-medium cursor-pointer text-gray-900">
                            1 Criativo + 1 Copy
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="2" id="q2" />
                          <Label htmlFor="q2" className="font-medium cursor-pointer text-gray-900">
                            2 Criativos + 2 Copys
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 235,87</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="4" id="q4" />
                          <Label htmlFor="q4" className="font-medium cursor-pointer text-gray-900">
                            4 Criativos + 4 Copys
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 471,74</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="8" id="q8" />
                          <Label htmlFor="q8" className="font-medium cursor-pointer text-gray-900">
                            8 Criativos + 8 Copys
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 943,48</span>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Tipo do Criativo */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-900">Tipo do Criativo</Label>
                    <RadioGroup
                      value={selectedCreativeType}
                      onValueChange={setSelectedCreativeType}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between p-4 border-2 border-blue-500 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="estatica" id="estatica" className="border-blue-600" />
                          <Label htmlFor="estatica" className="font-medium cursor-pointer text-gray-900">
                            Arte Estática
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="carrossel" id="carrossel" />
                          <Label htmlFor="carrossel" className="font-medium cursor-pointer text-gray-900">
                            Carrossel
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 50,00</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="motion" id="motion" />
                          <Label htmlFor="motion" className="font-medium cursor-pointer text-gray-900">
                            Motion
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 100,00</span>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Extras */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-900">Extras</Label>
                    <div className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${
                          selectedExtras.includes("expressa") ? "border-blue-500 bg-blue-50" : "hover:bg-blue-50"
                        }`}
                        onClick={() => toggleExtra("expressa")}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="expressa"
                            checked={selectedExtras.includes("expressa")}
                            onCheckedChange={() => toggleExtra("expressa")}
                          />
                          <Label htmlFor="expressa" className="font-medium cursor-pointer text-gray-900">
                            Entrega Expressa (24h)
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 75,50</span>
                      </div>
                      <div
                        className={`flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${
                          selectedExtras.includes("fonte") ? "border-blue-500 bg-blue-50" : "hover:bg-blue-50"
                        }`}
                        onClick={() => toggleExtra("fonte")}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="fonte"
                            checked={selectedExtras.includes("fonte")}
                            onCheckedChange={() => toggleExtra("fonte")}
                          />
                          <Label htmlFor="fonte" className="font-medium cursor-pointer text-gray-900">
                            Arquivos Fonte
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 45,00</span>
                      </div>
                      <div
                        className={`flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${
                          selectedExtras.includes("revisoes") ? "border-blue-500 bg-blue-50" : "hover:bg-blue-50"
                        }`}
                        onClick={() => toggleExtra("revisoes")}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="revisoes"
                            checked={selectedExtras.includes("revisoes")}
                            onCheckedChange={() => toggleExtra("revisoes")}
                          />
                          <Label htmlFor="revisoes" className="font-medium cursor-pointer text-gray-900">
                            Revisões Ilimitadas
                          </Label>
                        </div>
                        <span className="text-red-600 font-semibold">+ R$ 60,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-blue-200 shadow-sm">
                    <h4 className="font-bold text-base text-gray-900">Resumo</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium text-gray-900">Quantidade:</span> • {selectedQuantity} Criativo
                        {selectedQuantity !== "1" ? "s" : ""} + {selectedQuantity} Copy
                        {selectedQuantity !== "1" ? "s" : ""}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Tipo do Criativo:</span> •{" "}
                        {selectedCreativeType === "estatica"
                          ? "Arte Estática"
                          : selectedCreativeType === "carrossel"
                            ? "Carrossel"
                            : "Motion"}
                      </p>
                      {selectedExtras.length > 0 && (
                        <p>
                          <span className="font-medium text-gray-900">Extras:</span>
                          {selectedExtras.includes("expressa") && " • Entrega Expressa"}
                          {selectedExtras.includes("fonte") && " • Arquivos Fonte"}
                          {selectedExtras.includes("revisoes") && " • Revisões Ilimitadas"}
                        </p>
                      )}
                    </div>
                    <div className="border-t pt-3 mt-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Preço base:</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(productToCustomize.finalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-gray-900">Valor total:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(calculateCustomTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-t px-6 py-4 shrink-0">
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold"
                  onClick={() => {
                    handleAddToCart(productToCustomize)
                    setCustomizationModal(false)
                    setProductToCustomize(null)
                  }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  ADICIONAR AO CARRINHO
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
