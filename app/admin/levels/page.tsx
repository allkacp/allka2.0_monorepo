
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Plus, Trash2, Trophy } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function LevelsManagementPage() {
  const [agencyLevels, setAgencyLevels] = useState<any[]>([])
  const [partnerLevels, setPartnerLevels] = useState<any[]>([])
  const [editingLevel, setEditingLevel] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("agency")

  useEffect(() => {
    apiClient.getLevels().then((data: any) => {
      const all = Array.isArray(data) ? data : data?.data || []
      setAgencyLevels(all.filter((l: any) => l.type === "agency" || !l.type))
      setPartnerLevels(all.filter((l: any) => l.type === "partner"))
    }).catch(() => {})
  }, [])

  const handleSaveLevel = async (levelData: any) => {
    try {
      if (levelData.id) {
        await apiClient.updateLevel(String(levelData.id), { ...levelData, type: activeTab })
      } else {
        await apiClient.createLevel({ ...levelData, type: activeTab })
      }
      const data: any = await apiClient.getLevels()
      const all = Array.isArray(data) ? data : data?.data || []
      setAgencyLevels(all.filter((l: any) => l.type === "agency" || !l.type))
      setPartnerLevels(all.filter((l: any) => l.type === "partner"))
    } catch {}
    setEditingLevel(null)
    setIsDialogOpen(false)
  }

  const handleDeleteLevel = async (id: number) => {
    try {
      await apiClient.deleteLevel(String(id))
      if (activeTab === "agency") {
        setAgencyLevels((levels) => levels.filter((level) => level.id !== id))
      } else {
        setPartnerLevels((levels) => levels.filter((level) => level.id !== id))
      }
    } catch {}
  }

  const openEditDialog = (level?: any) => {
    setEditingLevel(
      level || {
        name: "",
        description: "",
        benefits: [],
        color: "#4F46E5",
        ...(activeTab === "agency"
          ? {
              min_mrr: 0,
              max_mrr: 0,
              commission_bonus: 0,
            }
          : {
              min_led_agencies: 0,
              max_led_agencies: 0,
              min_led_mrr: 0,
              max_led_mrr: 0,
              commission_rate: 0,
            }),
      },
    )
    setIsDialogOpen(true)
  }

  return (
    <div className="container mx-auto pt-6 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Gerenciamento de Níveis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure os níveis dos programas de incentivo para agências e partners</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="agency">Níveis de Agência</TabsTrigger>
          <TabsTrigger value="partner">Níveis de Partner</TabsTrigger>
        </TabsList>

        <TabsContent value="agency" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Níveis de Agência</h2>
              <p className="text-gray-600">Baseados no MRR (Monthly Recurring Revenue)</p>
            </div>
            <Button onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Nível
            </Button>
          </div>

          <div className="grid gap-4">
            {agencyLevels.map((level) => (
              <Card key={level.id} className="border-l-4" style={{ borderLeftColor: level.color }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: level.color }} />
                        {level.name}
                        <Badge variant="outline">+{level.commission_bonus}% comissão</Badge>
                      </CardTitle>
                      <CardDescription>{level.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(level)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteLevel(level.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Faixa de MRR</Label>
                      <div className="text-lg font-semibold">
                        R$ {level.min_mrr.toLocaleString()} - R$ {level.max_mrr.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Bônus de Comissão</Label>
                      <div className="text-lg font-semibold text-green-600">+{level.commission_bonus}%</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Benefícios</Label>
                      <div className="text-sm">{level.benefits.length} benefícios</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-600">Benefícios</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {level.benefits.map((benefit, index) => (
                        <Badge key={index} variant="secondary">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="partner" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Níveis de Partner</h2>
              <p className="text-gray-600">Baseados no número de agências lideradas e MRR total</p>
            </div>
            <Button onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Nível
            </Button>
          </div>

          <div className="grid gap-4">
            {partnerLevels.map((level) => (
              <Card key={level.id} className="border-l-4" style={{ borderLeftColor: level.color }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: level.color }} />
                        {level.name}
                        <Badge variant="outline">{level.commission_rate}% comissão</Badge>
                      </CardTitle>
                      <CardDescription>{level.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(level)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteLevel(level.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Agências Lideradas</Label>
                      <div className="text-lg font-semibold">
                        {level.min_led_agencies} - {level.max_led_agencies || "∞"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">MRR das Lideradas</Label>
                      <div className="text-lg font-semibold">
                        R$ {level.min_led_mrr.toLocaleString()} -{" "}
                        {level.max_led_mrr ? `R$ ${level.max_led_mrr.toLocaleString()}` : "∞"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Taxa de Comissão</Label>
                      <div className="text-lg font-semibold text-green-600">{level.commission_rate}%</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-600">Benefícios</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {level.benefits.map((benefit, index) => (
                        <Badge key={index} variant="secondary">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Level Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLevel?.id ? "Editar Nível" : "Criar Novo Nível"}</DialogTitle>
            <DialogDescription>Configure os critérios e benefícios do nível</DialogDescription>
          </DialogHeader>

          {editingLevel && (
            <LevelForm
              level={editingLevel}
              type={activeTab}
              onSave={handleSaveLevel}
              onCancel={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LevelForm({ level, type, onSave, onCancel }: any) {
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
          <Label htmlFor="name">Nome do Nível</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Gold"
          />
        </div>
        <div>
          <Label htmlFor="color">Cor</Label>
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o nível..."
        />
      </div>

      {type === "agency" ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="min_mrr">MRR Mínimo</Label>
            <Input
              id="min_mrr"
              type="number"
              value={formData.min_mrr}
              onChange={(e) => setFormData({ ...formData, min_mrr: Number.parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="max_mrr">MRR Máximo</Label>
            <Input
              id="max_mrr"
              type="number"
              value={formData.max_mrr}
              onChange={(e) => setFormData({ ...formData, max_mrr: Number.parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="commission_bonus">Bônus Comissão (%)</Label>
            <Input
              id="commission_bonus"
              type="number"
              value={formData.commission_bonus}
              onChange={(e) => setFormData({ ...formData, commission_bonus: Number.parseInt(e.target.value) })}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_led_agencies">Min. Agências Lideradas</Label>
            <Input
              id="min_led_agencies"
              type="number"
              value={formData.min_led_agencies}
              onChange={(e) => setFormData({ ...formData, min_led_agencies: Number.parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="max_led_agencies">Max. Agências Lideradas</Label>
            <Input
              id="max_led_agencies"
              type="number"
              value={formData.max_led_agencies || ""}
              onChange={(e) =>
                setFormData({ ...formData, max_led_agencies: e.target.value ? Number.parseInt(e.target.value) : null })
              }
              placeholder="Deixe vazio para ilimitado"
            />
          </div>
          <div>
            <Label htmlFor="min_led_mrr">MRR Mín. das Lideradas</Label>
            <Input
              id="min_led_mrr"
              type="number"
              value={formData.min_led_mrr}
              onChange={(e) => setFormData({ ...formData, min_led_mrr: Number.parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="max_led_mrr">MRR Max. das Lideradas</Label>
            <Input
              id="max_led_mrr"
              type="number"
              value={formData.max_led_mrr || ""}
              onChange={(e) =>
                setFormData({ ...formData, max_led_mrr: e.target.value ? Number.parseInt(e.target.value) : null })
              }
              placeholder="Deixe vazio para ilimitado"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="commission_rate">Taxa de Comissão (%)</Label>
            <Input
              id="commission_rate"
              type="number"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: Number.parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="benefits">Benefícios (um por linha)</Label>
        <Textarea
          id="benefits"
          value={benefitsText}
          onChange={(e) => setBenefitsText(e.target.value)}
          placeholder="Digite um benefício por linha..."
          rows={4}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave}>Salvar Nível</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
