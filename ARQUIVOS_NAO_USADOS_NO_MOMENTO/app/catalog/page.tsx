// @ts-nocheck
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Grid, List, SortAsc } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductFilters } from "@/components/product-filters"
import { useAccountType } from "@/contexts/account-type-context"
import type { Product, ViewMode, SortOption } from "@/types/product"

// Mock data - in real app this would come from API
const mockProducts: Product[] = [
  {
    id: "1",
    name: "Desenvolvimento de Landing Page",
    description: "Landing page completa com design responsivo e otimizada para conversão",
    shortDescription: "Landing page responsiva e otimizada",
    category: "Desenvolvimento Web",
    tags: ["landing page", "responsivo", "conversão", "SEO"],
    basePrice: 2500,
    complexity: "intermediate",
    visibility: { company: true, agency: true, partner: true, inHouse: true },
    variations: [
      {
        id: "1a",
        name: "Básica",
        description: "Design simples",
        priceModifier: 0.8,
        features: ["Design responsivo", "Formulário de contato"],
      },
      {
        id: "1b",
        name: "Premium",
        description: "Design avançado",
        priceModifier: 1.5,
        features: ["Design customizado", "Animações", "Analytics"],
      },
    ],
    addons: [
      {
        id: "1x",
        name: "SEO Avançado",
        description: "Otimização completa para buscadores",
        price: 500,
        category: "SEO",
      },
    ],
    stats: { contractCount: 156, averageRating: 4.8, completionTime: "5-7 dias" },
    demonstrations: ["https://demo1.com", "https://demo2.com"],
    image: "",
  },
  {
    id: "2",
    name: "Campanha de Marketing Digital",
    description: "Campanha completa de marketing digital com estratégia personalizada",
    shortDescription: "Campanha de marketing personalizada",
    category: "Marketing Digital",
    tags: ["marketing", "campanha", "digital", "estratégia"],
    basePrice: 5000,
    complexity: "advanced",
    visibility: { company: true, agency: true, partner: true, inHouse: false },
    variations: [],
    addons: [],
    stats: { contractCount: 89, averageRating: 4.6, completionTime: "15-20 dias" },
    demonstrations: [],
    image: "",
  },
  {
    id: "3",
    name: "Identidade Visual Completa",
    description: "Criação de identidade visual completa incluindo logo, cores e tipografia",
    shortDescription: "Identidade visual e branding",
    category: "Design",
    tags: ["identidade visual", "logo", "branding", "design"],
    basePrice: 3500,
    complexity: "intermediate",
    visibility: { company: true, agency: true, partner: true, inHouse: true },
    variations: [
      {
        id: "3a",
        name: "Essencial",
        description: "Logo + manual básico",
        priceModifier: 0.7,
        features: ["Logo", "Manual básico"],
      },
      {
        id: "3b",
        name: "Completa",
        description: "Identidade completa",
        priceModifier: 1.2,
        features: ["Logo", "Manual completo", "Aplicações"],
      },
    ],
    addons: [],
    stats: { contractCount: 203, averageRating: 4.9, completionTime: "10-12 dias" },
    demonstrations: [],
    image: "",
  },
]

export default function CatalogPage() {
  const { accountType, accountSubType } = useAccountType()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("popularity")
  const [creditPlan, setCreditPlan] = useState<number>(1000) // Mock credit plan

  const [filters, setFilters] = useState({
    search: "",
    categories: [] as string[],
    complexity: [] as string[],
    priceRange: [0, 10000] as [number, number],
    tags: [] as string[],
    minRating: 0,
  })

  // Filter products based on account visibility and filters
  const filteredProducts = useMemo(() => {
    let products = mockProducts.filter((product) => {
      // Check visibility based on account type
      if (accountType === "empresas") {
        if (accountSubType === "company") return product.visibility.company
        if (accountSubType === "in-house") return product.visibility.inHouse
      }
      if (accountType === "agencias") return product.visibility.agency
      return true
    })

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
      )
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      products = products.filter((product) => filters.categories.includes(product.category))
    }

    // Apply complexity filter
    if (filters.complexity.length > 0) {
      products = products.filter((product) => filters.complexity.includes(product.complexity))
    }

    // Apply price range filter
    products = products.filter(
      (product) => product.basePrice >= filters.priceRange[0] && product.basePrice <= filters.priceRange[1],
    )

    // Apply rating filter
    if (filters.minRating > 0) {
      products = products.filter((product) => product.stats.averageRating >= filters.minRating)
    }

    // Apply tags filter
    if (filters.tags.length > 0) {
      products = products.filter((product) => filters.tags.some((tag) => product.tags.includes(tag)))
    }

    return products
  }, [mockProducts, accountType, accountSubType, filters])

  // Sort products
  const sortedProducts = useMemo(() => {
    const products = [...filteredProducts]

    switch (sortBy) {
      case "name":
        return products.sort((a, b) => a.name.localeCompare(b.name))
      case "price":
        return products.sort((a, b) => a.basePrice - b.basePrice)
      case "rating":
        return products.sort((a, b) => b.stats.averageRating - a.stats.averageRating)
      case "popularity":
        return products.sort((a, b) => b.stats.contractCount - a.stats.contractCount)
      default:
        return products
    }
  }, [filteredProducts, sortBy])

  const availableCategories = Array.from(new Set(mockProducts.map((p) => p.category)))
  const availableTags = Array.from(new Set(mockProducts.flatMap((p) => p.tags)))
  const maxPrice = Math.max(...mockProducts.map((p) => p.basePrice))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Catálogo de Serviços</h1>
        <p className="text-gray-600">Encontre o serviço perfeito para suas necessidades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableCategories={availableCategories}
            availableTags={availableTags}
            maxPrice={maxPrice}
          />
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{sortedProducts.length} produtos encontrados</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Mais Popular</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="price">Menor Preço</SelectItem>
                  <SelectItem value="rating">Melhor Avaliado</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Products */}
          {sortedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum produto encontrado</p>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    search: "",
                    categories: [],
                    complexity: [],
                    priceRange: [0, maxPrice],
                    tags: [],
                    minRating: 0,
                  })
                }
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  creditPlan={accountType === "agencias" ? creditPlan : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
