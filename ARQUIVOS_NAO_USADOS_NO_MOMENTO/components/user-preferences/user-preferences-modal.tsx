
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Settings, Heart, User, DollarSign, Clock, Star, Plus, Trash2, Edit } from "lucide-react"

interface UserPreference {
  id: string
  preference_type: "product" | "nomad" | "category" | "budget" | "timeline"
  preference_key: string
  preference_value: any
  priority: number
  active: boolean
  created_at: string
}

interface PreferredProduct {
  product_id: string
  product_name: string
  category: string
  reason: string
  auto_add_to_cart: boolean
}

interface PreferredNomad {
  nomad_id: string
  nomad_name: string
  specialties: string[]
  rating: number
  preferred_for_categories: string[]
}

interface BudgetPreference {
  category: string
  min_budget: number
  max_budget: number
  preferred_budget: number
}

interface UserPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export default function UserPreferencesModal({ isOpen, onClose, userId }: UserPreferencesModalProps) {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<UserPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Parsed preferences
  const [preferredProducts, setPreferredProducts] = useState<PreferredProduct[]>([])
  const [preferredNomads, setPreferredNomads] = useState<PreferredNomad[]>([])
  const [budgetPreferences, setBudgetPreferences] = useState<BudgetPreference[]>([])
  const [categoryPreferences, setCategoryPreferences] = useState<string[]>([])
  const [timelinePreferences, setTimelinePreferences] = useState<Record<string, number>>({})

  useEffect(() => {
    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen, userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)

      // Mock data - in real app, fetch from API
      const mockPreferences: UserPreference[] = [
        {
          id: "pref-1",
          preference_type: "product",
          preference_key: "logo_design",
          preference_value: {
            product_id: "product-1",
            product_name: "Logo Design Premium",
            category: "Design",
            reason: "Sempre preciso de logos de qualidade",
            auto_add_to_cart: true,
          },
          priority: 1,
          active: true,
          created_at: "2024-12-20T10:00:00Z",
        },
        {
          id: "pref-2",
          preference_type: "nomad",
          preference_key: "designer_joao",
          preference_value: {
            nomad_id: "nomad-1",
            nomad_name: "João Designer",
            specialties: ["Logo", "Identidade Visual", "Branding"],
            rating: 4.9,
            preferred_for_categories: ["Design", "Branding"],
          },
          priority: 1,
          active: true,
          created_at: "2024-12-21T14:00:00Z",
        },
        {
          id: "pref-3",
          preference_type: "budget",
          preference_key: "design_budget",
          preference_value: {
            category: "Design",
            min_budget: 1000,
            max_budget: 5000,
            preferred_budget: 2500,
          },
          priority: 1,
          active: true,
          created_at: "2024-12-22T09:00:00Z",
        },
        {
          id: "pref-4",
          preference_type: "category",
          preference_key: "favorite_categories",
          preference_value: ["Design", "Marketing", "Desenvolvimento"],
          priority: 1,
          active: true,
          created_at: "2024-12-23T16:00:00Z",
        },
      ]

      setPreferences(mockPreferences)
      parsePreferences(mockPreferences)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar preferências",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const parsePreferences = (prefs: UserPreference[]) => {
    const products: PreferredProduct[] = []
    const nomads: PreferredNomad[] = []
    const budgets: BudgetPreference[] = []
    let categories: string[] = []
    const timelines: Record<string, number> = {}

    prefs.forEach((pref) => {
      if (!pref.active) return

      switch (pref.preference_type) {
        case "product":
          products.push(pref.preference_value)
          break
        case "nomad":
          nomads.push(pref.preference_value)
          break
        case "budget":
          budgets.push(pref.preference_value)
          break
        case "category":
          categories = pref.preference_value
          break
        case "timeline":
          Object.assign(timelines, pref.preference_value)
          break
      }
    })

    setPreferredProducts(products)
    setPreferredNomads(nomads)
    setBudgetPreferences(budgets)
    setCategoryPreferences(categories)
    setTimelinePreferences(timelines)
  }

  const savePreferences = async () => {
    try {
      setSaving(true)

      // Mock save - in real app, send to API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Preferências Salvas",
        description: "Suas preferências foram atualizadas com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar preferências",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const removePreferredProduct = (productId: string) => {
    setPreferredProducts((prev) => prev.filter((p) => p.product_id !== productId))
  }

  const removePreferredNomad = (nomadId: string) => {
    setPreferredNomads((prev) => prev.filter((n) => n.nomad_id !== nomadId))
  }

  const removeBudgetPreference = (category: string) => {
    setBudgetPreferences((prev) => prev.filter((b) => b.category !== category))
  }

  const toggleCategoryPreference = (category: string) => {
    setCategoryPreferences((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Carregando preferências...</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Minhas Preferências
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products">
              <Heart className="h-4 w-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="nomads">
              <User className="h-4 w-4 mr-2" />
              Nômades
            </TabsTrigger>
            <TabsTrigger value="budget">
              <DollarSign className="h-4 w-4 mr-2" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Star className="h-4 w-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Prazos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Produtos Preferidos</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {preferredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhum produto preferido ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preferredProducts.map((product) => (
                      <Card key={product.product_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{product.product_name}</h4>
                                <Badge variant="secondary">{product.category}</Badge>
                                {product.auto_add_to_cart && (
                                  <Badge className="bg-green-100 text-green-800">Auto-adicionar</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{product.reason}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removePreferredProduct(product.product_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nomads" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Nômades Preferidos</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Nômade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {preferredNomads.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhum nômade preferido ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preferredNomads.map((nomad) => (
                      <Card key={nomad.nomad_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{nomad.nomad_name}</h4>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-sm">{nomad.rating}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {nomad.specialties.map((specialty) => (
                                  <Badge key={specialty} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                              <div className="text-sm text-gray-600">
                                Preferido para: {nomad.preferred_for_categories.join(", ")}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => removePreferredNomad(nomad.nomad_id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preferências de Orçamento</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Categoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {budgetPreferences.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhuma preferência de orçamento definida</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {budgetPreferences.map((budget) => (
                      <Card key={budget.category}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium mb-2">{budget.category}</h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Mínimo:</span>
                                  <div>
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(budget.min_budget)}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">Preferido:</span>
                                  <div>
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(budget.preferred_budget)}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">Máximo:</span>
                                  <div>
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(budget.max_budget)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => removeBudgetPreference(budget.category)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Categorias Favoritas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "Design",
                    "Desenvolvimento",
                    "Marketing",
                    "Consultoria",
                    "Redação",
                    "Tradução",
                    "Vídeo",
                    "Fotografia",
                  ].map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        checked={categoryPreferences.includes(category)}
                        onCheckedChange={() => toggleCategoryPreference(category)}
                      />
                      <label className="text-sm font-medium">{category}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Prazo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Configure seus prazos preferidos para diferentes tipos de projeto
                  </div>

                  {["Design", "Desenvolvimento", "Marketing", "Consultoria"].map((category) => (
                    <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Dias"
                          className="w-20"
                          value={timelinePreferences[category] || ""}
                          onChange={(e) =>
                            setTimelinePreferences((prev) => ({
                              ...prev,
                              [category]: Number.parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                        <span className="text-sm text-gray-500">dias</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
