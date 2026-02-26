// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Plus, Trash2, Zap, Star, TrendingUp, Users, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const mockNomadLevels = [
  {
    id: 1,
    name: "Bronze",
    min_points: 0,
    max_points: 999,
    benefits: ["Acesso a tarefas básicas", "Suporte por email", "Badge Bronze no perfil"],
    bonus_percentage: 0,
    description: "Nível inicial para nômades começando na plataforma",
    color: "#CD7F32",
    xp_required: 0,
    icon: "🥉",
    gradient: "from-amber-900 to-orange-900",
  },
  {
    id: 2,
    name: "Silver",
    min_points: 1000,
    max_points: 4999,
    benefits: ["Acesso a tarefas intermediárias", "Suporte prioritário", "Badge Silver", "Bônus 5% em tarefas"],
    bonus_percentage: 5,
    description: "Para nômades com performance consistente",
    color: "#C0C0C0",
    xp_required: 1000,
    icon: "🥈",
    gradient: "from-slate-700 to-slate-800",
  },
  {
    id: 3,
    name: "Gold",
    min_points: 5000,
    max_points: 9999,
    benefits: ["Todas as tarefas", "Suporte VIP 24/7", "Badge Gold", "Bônus 10%", "Acesso antecipado a projetos"],
    bonus_percentage: 10,
    description: "Nômades de alto desempenho",
    color: "#FFD700",
    xp_required: 5000,
    icon: "🥇",
    gradient: "from-yellow-700 to-amber-800",
  },
]

export default function NiveisNomadesPage() {
  const [nomadLevels, setNomadLevels] = useState(mockNomadLevels)
  const [editingLevel, setEditingLevel] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSaveLevel = (levelData: any) => {
    if (levelData.id) {
      setNomadLevels((levels) => levels.map((level) => (level.id === levelData.id ? levelData : level)))
    } else {
      const newLevel = { ...levelData, id: Date.now() }
      setNomadLevels((levels) => [...levels, newLevel])
    }
    setEditingLevel(null)
    setIsDialogOpen(false)
  }

  const handleDeleteLevel = (id: number) => {
    setNomadLevels((levels) => levels.filter((level) => level.id !== id))
  }

  const openEditDialog = (level?: any) => {
    setEditingLevel(
      level || {
        name: "",
        description: "",
        benefits: [],
        color: "#4F46E5",
        xp_required: 0,
        icon: "🌟",
        gradient: "from-blue-600 to-cyan-600",
        min_points: 0,
        max_points: 0,
        bonus_percentage: 0,
      },
    )
    setIsDialogOpen(true)
  }

  return (
    <div className="min-h-screen px-6 space-y-6 bg-slate-200 pt-0 pl-0 pr-0 pr-5">
      <PageHeader
        title="Níveis de Nômades"
        description="Configure os níveis de gamificação baseados em pontos de experiência"
        action={
          <Button
            onClick={() => openEditDialog()}
            className="btn-brand shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Nível
          </Button>
        }
      />

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
        <div className="grid gap-4">
          {nomadLevels.map((level, index) => (
            <div
              key={level.id}
              className="group animate-in fade-in slide-in-from-bottom duration-700"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card
                className={`relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl bg-gradient-to-br ${level.gradient} border-gray-700/50 hover:border-gray-600`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  style={{
                    background: `radial-gradient(circle at center, ${level.color}40, transparent 70%)`,
                  }}
                />

                <CardHeader className="relative p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl animate-bounce-slow">{level.icon}</div>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                          <div
                            className="w-2 h-2 rounded-full animate-pulse shadow-lg"
                            style={{
                              backgroundColor: level.color,
                              boxShadow: `0 0 15px ${level.color}80`,
                            }}
                          />
                          {level.name}
                          <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-md shadow-green-500/30">
                            <Zap className="h-3 w-3 mr-1" />+{level.bonus_percentage}% bônus
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-100 mt-1 text-sm">{level.description}</CardDescription>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-200">
                            <span>XP Necessário</span>
                            <span className="font-semibold text-cyan-300">{level.xp_required.toLocaleString()} XP</span>
                          </div>
                          <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-1000 shadow-sm"
                              style={{
                                width: `${Math.min((level.xp_required / 10000) * 100, 100)}%`,
                                boxShadow: "0 0 10px rgba(34, 211, 238, 0.6)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(level)}
                        className="border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-400 text-white transition-all duration-300"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLevel(level.id)}
                        className="border-red-400 bg-red-900/50 hover:bg-red-800/50 hover:border-red-300 text-red-200 transition-all duration-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative p-3 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 hover:border-white/30 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <Label className="text-xs font-medium text-gray-200">Faixa de Pontos</Label>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {level.min_points.toLocaleString()} - {level.max_points.toLocaleString()} pts
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 hover:border-white/30 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3 w-3 text-green-400" />
                        <Label className="text-xs font-medium text-gray-200">Bônus em Tarefas</Label>
                      </div>
                      <div className="text-sm font-bold text-green-300">+{level.bonus_percentage}%</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 hover:border-white/30 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3 w-3 text-blue-400" />
                        <Label className="text-xs font-medium text-gray-200">Benefícios</Label>
                      </div>
                      <div className="text-sm font-bold text-white">{level.benefits.length} benefícios</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-200 flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-purple-400" />
                      Benefícios Desbloqueados
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {level.benefits.map((benefit, index) => (
                        <Badge
                          key={index}
                          className="bg-white/10 backdrop-blur-sm text-gray-100 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105 text-xs"
                        >
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingLevel?.id ? "Editar Nível" : "Criar Novo Nível"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Configure os critérios e benefícios do nível de nômade
            </DialogDescription>
          </DialogHeader>

          {editingLevel && (
            <LevelForm level={editingLevel} onSave={handleSaveLevel} onCancel={() => setIsDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LevelForm({ level, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(level)
  const [benefitsText, setBenefitsText] = useState(level.benefits?.join("\n") || "")

  const handleSave = () => {
    const benefits = benefitsText.split("\n").filter((b) => b.trim())
    onSave({ ...formData, benefits })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-gray-700">
            Nome do Nível
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Gold"
            className="bg-white border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <Label htmlFor="color" className="text-gray-700">
            Cor
          </Label>
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="bg-white border-gray-300"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-gray-700">
          Descrição
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o nível..."
          className="bg-white border-gray-300 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="min_points" className="text-gray-700">
            Pontos Mínimos
          </Label>
          <Input
            id="min_points"
            type="number"
            value={formData.min_points}
            onChange={(e) => setFormData({ ...formData, min_points: Number.parseInt(e.target.value) })}
            className="bg-white border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <Label htmlFor="max_points" className="text-gray-700">
            Pontos Máximos
          </Label>
          <Input
            id="max_points"
            type="number"
            value={formData.max_points}
            onChange={(e) => setFormData({ ...formData, max_points: Number.parseInt(e.target.value) })}
            className="bg-white border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <Label htmlFor="bonus_percentage" className="text-gray-700">
            Bônus em Tarefas (%)
          </Label>
          <Input
            id="bonus_percentage"
            type="number"
            value={formData.bonus_percentage}
            onChange={(e) => setFormData({ ...formData, bonus_percentage: Number.parseInt(e.target.value) })}
            className="bg-white border-gray-300 text-gray-900"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="xp_required" className="text-gray-700">
          XP Necessário
        </Label>
        <Input
          id="xp_required"
          type="number"
          value={formData.xp_required}
          onChange={(e) => setFormData({ ...formData, xp_required: Number.parseInt(e.target.value) })}
          className="bg-white border-gray-300 text-gray-900"
        />
      </div>

      <div>
        <Label htmlFor="benefits" className="text-gray-700">
          Benefícios (um por linha)
        </Label>
        <Textarea
          id="benefits"
          value={benefitsText}
          onChange={(e) => setBenefitsText(e.target.value)}
          placeholder="Digite um benefício por linha..."
          rows={4}
          className="bg-white border-gray-300 text-gray-900"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          className="btn-brand"
        >
          Salvar Nível
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
