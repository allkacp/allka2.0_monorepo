export interface Product {
  id: string
  name: string
  description: string
  shortDescription: string
  category: string
  tags: string[]
  basePrice: number
  complexity: "basic" | "intermediate" | "advanced" | "premium"
  visibility: {
    company: boolean
    agency: boolean
    partner: boolean
    inHouse: boolean
  }
  variations: ProductVariation[]
  addons: ProductAddon[]
  stats: {
    contractCount: number
    averageRating: number
    completionTime: string
  }
  demonstrations: string[]
  image: string
}

export interface ProductVariation {
  id: string
  name: string
  description: string
  priceModifier: number // multiplier for base price
  features: string[]
}

export interface ProductAddon {
  id: string
  name: string
  description: string
  price: number
  category: string
}

export type ViewMode = "grid" | "list"
export type SortOption = "name" | "price" | "rating" | "popularity"
