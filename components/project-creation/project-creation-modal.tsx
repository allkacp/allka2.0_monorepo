// @ts-nocheck
import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Bot, Lightbulb, Package, Plus, X } from "lucide-react"
import { type Client, type User, type Product, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ProjectCreationModalProps {
  open: boolean
  onClose: () => void
}

interface FormData {
  name: string
  description: string
  client_id: string
  manager_id: string
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  start_date: string
  end_date: string
  budget: string
  goals: string[]
  target_audience: string
  industry: string
}

interface AISuggestion {
  type: "product" | "combo" | "addon"
  item: Product
  reason: string
  confidence: number
}

export function ProjectCreationModal({ open, onClose }: ProjectCreationModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [currentGoal, setCurrentGoal] = useState("")

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    client_id: "",
    manager_id: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget: "",
    goals: [],
    target_audience: "",
    industry: "",
  })

  // Load form data
  useEffect(() => {
    const loadFormData = async () => {
      if (!open) return

      try {
        const [clientsData, usersData, productsData] = await Promise.all([
          apiClient.getClients(),
          apiClient.getUsers(),
          apiClient.getProducts(),
        ])
        setClients(clientsData)
        setUsers(usersData.filter((user) => user.role === "manager" || user.role === "admin"))
        setProducts(productsData)
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao carregar dados do formulário",
          variant: "destructive",
        })
      }
    }

    loadFormData()
  }, [open, toast])

  // Generate AI suggestions based on form data
  const generateAISuggestions = async () => {
    if (!formData.description && !formData.goals.length && !formData.industry) return

    try {
      const response = await fetch("/api/projects/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          goals: formData.goals,
          industry: formData.industry,
          target_audience: formData.target_audience,
          budget: formData.budget,
        }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        setAiSuggestions(suggestions)
      }
    } catch (error) {
      console.error("Failed to generate AI suggestions:", error)
    }
  }

  // Trigger AI suggestions when relevant fields change
  useEffect(() => {
    const timer = setTimeout(() => {
      generateAISuggestions()
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData.description, formData.goals, formData.industry, formData.target_audience])

  const addGoal = () => {
    if (currentGoal.trim() && !formData.goals.includes(currentGoal.trim())) {
      setFormData((prev) => ({
        ...prev,
        goals: [...prev.goals, currentGoal.trim()],
      }))
      setCurrentGoal("")
    }
  }

  const removeGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g !== goal),
    }))
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.client_id || !formData.manager_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        client_id: Number.parseInt(formData.client_id),
        manager_id: Number.parseInt(formData.manager_id),
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
        goals: formData.goals,
        target_audience: formData.target_audience,
        industry: formData.industry,
        selected_products: selectedProducts,
      }

      await apiClient.createProject(projectData)

      toast({
        title: "Sucesso",
        description: "Projeto criado com sucesso",
      })

      onClose()
      window.location.reload() // Refresh to show new project
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar projeto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Criar Novo Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Main Form */}
          <div className="flex-1 overflow-y-auto pr-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Básicas</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Projeto *</Label>
                    <Input
                      id="name"
                      placeholder="Digite o nome do projeto"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Setor/Indústria</Label>
                    <Input
                      id="industry"
                      placeholder="Ex: E-commerce, Saúde, Educação"
                      value={formData.industry}
                      onChange={(e) => updateField("industry", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do Projeto</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o projeto, seus objetivos e necessidades"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Público-Alvo</Label>
                  <Input
                    id="target_audience"
                    placeholder="Descreva o público-alvo do projeto"
                    value={formData.target_audience}
                    onChange={(e) => updateField("target_audience", e.target.value)}
                  />
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <Label>Objetivos do Projeto</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite um objetivo e pressione Enter"
                      value={currentGoal}
                      onChange={(e) => setCurrentGoal(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())}
                    />
                    <Button type="button" onClick={addGoal} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.goals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.goals.map((goal, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {goal}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeGoal(goal)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detalhes do Projeto</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => updateField("client_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manager">Gerente *</Label>
                    <Select value={formData.manager_id} onValueChange={(value) => updateField("manager_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um gerente" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planejamento</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="on_hold">Em Espera</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => updateField("start_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Orçamento</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.budget}
                      onChange={(e) => updateField("budget", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Criar Projeto"}
                </Button>
              </div>
            </form>
          </div>

          {/* AI Suggestions Sidebar */}
          <div className="w-80 border-l pl-6">
            <div className="sticky top-0">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Sugestões da IA</h3>
              </div>

              <ScrollArea className="h-[calc(90vh-200px)]">
                {aiSuggestions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Preencha a descrição e objetivos para receber sugestões personalizadas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-all ${
                          selectedProducts.includes(suggestion.item.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:shadow-md"
                        }`}
                        onClick={() => toggleProductSelection(suggestion.item.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm">{suggestion.item.name}</CardTitle>
                            <Badge variant={suggestion.confidence > 0.8 ? "default" : "secondary"} className="text-xs">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">{suggestion.item.shortDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground mb-2">
                            <strong>Por que sugerimos:</strong> {suggestion.reason}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">R$ {suggestion.item.basePrice.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.item.complexity}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
