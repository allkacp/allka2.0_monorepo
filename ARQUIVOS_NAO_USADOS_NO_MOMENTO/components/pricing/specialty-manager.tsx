
import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, DollarSign, Clock, Users } from "lucide-react"
import type { Specialty } from "@/types/pricing"

// Mock data for demonstration
const mockSpecialties: Specialty[] = [
  {
    id: "1",
    name: "Design Gráfico",
    description: "Criação de materiais visuais, identidade visual e peças gráficas",
    hourlyRate: 85,
    category: "Design",
    requiredSkills: ["Adobe Creative Suite", "Figma", "Branding"],
    marketResearchDate: "2024-01-15",
    isActive: true,
  },
  {
    id: "2",
    name: "Desenvolvimento Web",
    description: "Desenvolvimento de websites e aplicações web",
    hourlyRate: 120,
    category: "Tecnologia",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    marketResearchDate: "2024-01-15",
    isActive: true,
  },
  {
    id: "3",
    name: "Marketing Digital",
    description: "Estratégias de marketing online e gestão de campanhas",
    hourlyRate: 95,
    category: "Marketing",
    requiredSkills: ["Google Ads", "Facebook Ads", "Analytics"],
    marketResearchDate: "2024-01-15",
    isActive: true,
  },
]

export function SpecialtyManager() {
  const [specialties, setSpecialties] = useState<Specialty[]>(mockSpecialties)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hourlyRate: 0,
    category: "",
    requiredSkills: "",
    isActive: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newSpecialty: Specialty = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      hourlyRate: formData.hourlyRate,
      category: formData.category,
      requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()),
      marketResearchDate: new Date().toISOString().split("T")[0],
      isActive: formData.isActive,
    }

    if (editingId) {
      setSpecialties((prev) => prev.map((s) => (s.id === editingId ? newSpecialty : s)))
    } else {
      setSpecialties((prev) => [...prev, newSpecialty])
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      hourlyRate: 0,
      category: "",
      requiredSkills: "",
      isActive: true,
    })
    setIsCreating(false)
    setEditingId(null)
  }

  const handleEdit = (specialty: Specialty) => {
    setFormData({
      name: specialty.name,
      description: specialty.description,
      hourlyRate: specialty.hourlyRate,
      category: specialty.category,
      requiredSkills: specialty.requiredSkills.join(", "),
      isActive: specialty.isActive,
    })
    setEditingId(specialty.id)
    setIsCreating(true)
  }

  const handleDelete = (id: string) => {
    setSpecialties((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleActive = (id: string) => {
    setSpecialties((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Especialidades</h2>
          <p className="text-muted-foreground">Configure as especialidades e valores por hora dos nômades</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Especialidade
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Especialidades</p>
                <p className="text-2xl font-bold">{specialties.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Médio/Hora</p>
                <p className="text-2xl font-bold">
                  R$ {Math.round(specialties.reduce((acc, s) => acc + s.hourlyRate, 0) / specialties.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Especialidades Ativas</p>
                <p className="text-2xl font-bold">{specialties.filter((s) => s.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Especialidade" : "Nova Especialidade"}</CardTitle>
            <CardDescription>Configure os detalhes da especialidade e valor por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Especialidade</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Design Gráfico"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="Ex: Design, Tecnologia, Marketing"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva as responsabilidades e escopo desta especialidade"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Valor por Hora (R$)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                    placeholder="85"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiredSkills">Habilidades Necessárias</Label>
                  <Input
                    id="requiredSkills"
                    value={formData.requiredSkills}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requiredSkills: e.target.value }))}
                    placeholder="Figma, Adobe Creative Suite, Branding"
                  />
                  <p className="text-xs text-muted-foreground">Separe por vírgulas</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Especialidade ativa</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Atualizar" : "Criar"} Especialidade</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Specialties List */}
      <div className="grid gap-4">
        {specialties.map((specialty) => (
          <Card key={specialty.id} className={!specialty.isActive ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{specialty.name}</h3>
                    <Badge variant={specialty.isActive ? "default" : "secondary"}>
                      {specialty.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline">{specialty.category}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{specialty.description}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">R$ {specialty.hourlyRate}/hora</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {specialty.requiredSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(specialty.id)}>
                    {specialty.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(specialty)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(specialty.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
