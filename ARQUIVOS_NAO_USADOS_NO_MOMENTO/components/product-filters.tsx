
import { useState } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Search, Filter, X } from "lucide-react"
import { formatPrice } from "@/lib/pricing"

interface FilterState {
  search: string
  categories: string[]
  complexity: string[]
  priceRange: [number, number]
  tags: string[]
  minRating: number
}

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableCategories: string[]
  availableTags: string[]
  maxPrice: number
}

export function ProductFilters({
  filters,
  onFiltersChange,
  availableCategories,
  availableTags,
  maxPrice,
}: ProductFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      categories: [],
      complexity: [],
      priceRange: [0, maxPrice],
      tags: [],
      minRating: 0,
    })
  }

  const activeFiltersCount =
    filters.categories.length +
    filters.complexity.length +
    filters.tags.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar produtos, tags, variações..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4 space-y-6">
            {/* Categories */}
            <div>
              <CardTitle className="text-sm font-medium mb-3">Categorias</CardTitle>
              <div className="space-y-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={filters.categories.includes(category)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({ categories: [...filters.categories, category] })
                        } else {
                          updateFilters({
                            categories: filters.categories.filter((c) => c !== category),
                          })
                        }
                      }}
                    />
                    <label htmlFor={category} className="text-sm">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <CardTitle className="text-sm font-medium mb-3">Complexidade</CardTitle>
              <div className="space-y-2">
                {["basic", "intermediate", "advanced", "premium"].map((complexity) => (
                  <div key={complexity} className="flex items-center space-x-2">
                    <Checkbox
                      id={complexity}
                      checked={filters.complexity.includes(complexity)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({ complexity: [...filters.complexity, complexity] })
                        } else {
                          updateFilters({
                            complexity: filters.complexity.filter((c) => c !== complexity),
                          })
                        }
                      }}
                    />
                    <label htmlFor={complexity} className="text-sm capitalize">
                      {complexity}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <CardTitle className="text-sm font-medium mb-3">Faixa de Preço</CardTitle>
              <div className="px-2">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  max={maxPrice}
                  step={100}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatPrice(filters.priceRange[0])}</span>
                  <span>{formatPrice(filters.priceRange[1])}</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div>
              <CardTitle className="text-sm font-medium mb-3">Avaliação Mínima</CardTitle>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rating-${rating}`}
                      checked={filters.minRating === rating}
                      onCheckedChange={(checked) => {
                        updateFilters({ minRating: checked ? rating : 0 })
                      }}
                    />
                    <label htmlFor={`rating-${rating}`} className="text-sm">
                      {rating}+ estrelas
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div>
              <CardTitle className="text-sm font-medium mb-3">Tags Populares</CardTitle>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 10).map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (filters.tags.includes(tag)) {
                        updateFilters({ tags: filters.tags.filter((t) => t !== tag) })
                      } else {
                        updateFilters({ tags: [...filters.tags, tag] })
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
