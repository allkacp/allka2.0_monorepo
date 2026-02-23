// @ts-nocheck
import { useState, useMemo, memo, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Briefcase, Plus, Edit, Trash2, DollarSign, Users, Bot, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useSpecialties, type Specialty } from "@/lib/contexts/specialty-context"
import { toast } from "@/hooks/use-toast"

// Memoized SpecialtyCard component to prevent unnecessary re-renders
const SpecialtyCard = memo(
  ({
    specialty,
    onEdit,
    onDelete,
  }: {
    specialty: Specialty
    onEdit: (specialty: Specialty) => void
    onDelete: (specialty: Specialty) => void
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            {specialty.name}
          </CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {specialty.activeNomades} nômades
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Iniciante</span>
            <span className="font-semibold text-gray-900">R$ {specialty.rates.iniciante}/h</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600">Júnior</span>
            <span className="font-semibold text-blue-700">R$ {specialty.rates.junior}/h</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
            <span className="text-sm text-purple-600">Pleno</span>
            <span className="font-semibold text-purple-700">R$ {specialty.rates.pleno}/h</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
            <span className="text-sm text-green-600">Sênior</span>
            <span className="font-semibold text-green-700">R$ {specialty.rates.senior}/h</span>
          </div>
        </div>

        {specialty.aiEnabled && (
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
            <span className="text-sm text-violet-600 flex items-center gap-1.5">
              <Bot className="h-4 w-4" />
              IA Habilitada
            </span>
            <span className="font-semibold text-violet-700">R$ {specialty.aiFixedValue?.toFixed(2) || "0.00"}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => onEdit(specialty)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
            onClick={() => onDelete(specialty)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
)
SpecialtyCard.displayName = "SpecialtyCard"

// Memoized Stats Cards
const StatsCards = memo(
  ({
    totalSpecialties,
    totalNomades,
    avgRatePleno,
  }: {
    totalSpecialties: number
    totalNomades: number
    avgRatePleno: number
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total de Especialidades</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{totalSpecialties}</p>
            </div>
            <Briefcase className="h-10 w-10 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Nômades Ativos</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{totalNomades}</p>
            </div>
            <Users className="h-10 w-10 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Valor Médio (Pleno)</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">R$ {avgRatePleno}/h</p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
)
StatsCards.displayName = "StatsCards"

export default function EspecialidadesPage() {
  const { specialties, addSpecialty, updateSpecialty, deleteSpecialty } = useSpecialties()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; specialty: Specialty | null }>({
    isOpen: false,
    specialty: null,
  })
  const [formData, setFormData] = useState({
    name: "",
    iniciante: "",
    junior: "",
    pleno: "",
    senior: "",
    aiEnabled: false,
    aiFixedValue: "",
  })

  // Memoized stats calculations
  const { totalSpecialties, totalNomades, avgRatePleno } = useMemo(() => {
    return {
      totalSpecialties: specialties.length,
      totalNomades: specialties.reduce((sum, s) => sum + s.activeNomades, 0),
      avgRatePleno:
        specialties.length > 0
          ? Math.round(specialties.reduce((sum, s) => sum + s.rates.pleno, 0) / specialties.length)
          : 0,
    }
  }, [specialties])

  const handleOpenDialog = (specialty?: Specialty) => {
    if (specialty) {
      setEditingSpecialty(specialty)
      setFormData({
        name: specialty.name,
        iniciante: specialty.rates.iniciante.toString(),
        junior: specialty.rates.junior.toString(),
        pleno: specialty.rates.pleno.toString(),
        senior: specialty.rates.senior.toString(),
        aiEnabled: specialty.aiEnabled || false,
        aiFixedValue: specialty.aiFixedValue?.toString() || "",
      })
    } else {
      setEditingSpecialty(null)
      setFormData({ name: "", iniciante: "", junior: "", pleno: "", senior: "", aiEnabled: false, aiFixedValue: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome da especialidade",
        variant: "destructive",
      })
      return
    }

    if (!formData.iniciante || !formData.junior || !formData.pleno || !formData.senior) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os valores por hora",
        variant: "destructive",
      })
      return
    }

    if (formData.aiEnabled && !formData.aiFixedValue) {
      toast({
        title: "Valor da IA obrigatório",
        description: "Preencha o valor fixo da IA quando habilitada",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    // Simula delay mínimo de salvamento (reduzido para otimização)
    await new Promise((resolve) => setTimeout(resolve, 200))

    const newSpecialty: Specialty = {
      id: editingSpecialty?.id || Date.now(),
      name: formData.name,
      rates: {
        iniciante: Number.parseFloat(formData.iniciante),
        junior: Number.parseFloat(formData.junior),
        pleno: Number.parseFloat(formData.pleno),
        senior: Number.parseFloat(formData.senior),
      },
      activeNomades: editingSpecialty?.activeNomades || 0,
      status: "active",
      aiEnabled: formData.aiEnabled,
      aiFixedValue: formData.aiFixedValue ? Number.parseFloat(formData.aiFixedValue) : undefined,
    }

    try {
      if (editingSpecialty) {
        updateSpecialty(editingSpecialty.id, newSpecialty)
        toast({
          title: "Especialidade atualizada",
          description: `${formData.name} foi atualizado com sucesso`,
        })
      } else {
        addSpecialty(newSpecialty)
        toast({
          title: "Especialidade criada",
          description: `${formData.name} foi criado com sucesso`,
        })
      }

      setIsDialogOpen(false)
      setFormData({ name: "", iniciante: "", junior: "", pleno: "", senior: "", aiEnabled: false, aiFixedValue: "" })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a especialidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = (specialty: Specialty) => {
    setDeleteConfirm({ isOpen: true, specialty })
  }

  const handleDelete = () => {
    if (deleteConfirm.specialty) {
      deleteSpecialty(deleteConfirm.specialty.id)
      toast({
        title: "Especialidade removida",
        description: `${deleteConfirm.specialty.name} foi removido com sucesso`,
      })
      setDeleteConfirm({ isOpen: false, specialty: null })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Especialidades"
        description="Configure valores por hora para cada especialidade e nível de experiência"
        action={
          <Button onClick={() => handleOpenDialog()} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nova Especialidade
          </Button>
        }
      />

      {/* Stats Cards */}
      <StatsCards totalSpecialties={totalSpecialties} totalNomades={totalNomades} avgRatePleno={avgRatePleno} />

      {/* Specialties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialties.map((specialty) => (
          <SpecialtyCard
            key={specialty.id}
            specialty={specialty}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteConfirm}
          />
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpecialty ? "Editar Especialidade" : "Nova Especialidade"}</DialogTitle>
            <DialogDescription>
              Configure o nome da especialidade e os valores por hora para cada nível de experiência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Especialidade</Label>
              <Input
                id="name"
                placeholder="Ex: Design Gráfico"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Valores por Hora (R$)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="iniciante" className="text-xs text-gray-600">
                    Iniciante
                  </Label>
                  <Input
                    id="iniciante"
                    type="number"
                    placeholder="35"
                    value={formData.iniciante}
                    onChange={(e) => setFormData({ ...formData, iniciante: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="junior" className="text-xs text-blue-600">
                    Júnior
                  </Label>
                  <Input
                    id="junior"
                    type="number"
                    placeholder="50"
                    value={formData.junior}
                    onChange={(e) => setFormData({ ...formData, junior: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pleno" className="text-xs text-purple-600">
                    Pleno
                  </Label>
                  <Input
                    id="pleno"
                    type="number"
                    placeholder="75"
                    value={formData.pleno}
                    onChange={(e) => setFormData({ ...formData, pleno: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="senior" className="text-xs text-green-600">
                    Senior
                  </Label>
                  <Input
                    id="senior"
                    type="number"
                    placeholder="120"
                    value={formData.senior}
                    onChange={(e) => setFormData({ ...formData, senior: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-violet-600" />
                  <Label className="text-sm font-medium text-violet-700">Integração com IA</Label>
                </div>
                <Switch
                  checked={formData.aiEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
                />
              </div>
              <p className="text-xs text-violet-600">
                Permite que a IA execute tarefas ou auxilie o profissional nesta especialidade
              </p>
              {formData.aiEnabled && (
                <div className="pt-2">
                  <Label htmlFor="aiFixedValue" className="text-xs text-violet-700">
                    Valor Fixo da IA (R$)
                  </Label>
                  <div className="relative mt-1">
                    <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                    <Input
                      id="aiFixedValue"
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={formData.aiFixedValue}
                      onChange={(e) => setFormData({ ...formData, aiFixedValue: e.target.value })}
                      className="pl-9 border-violet-300 focus:border-violet-500"
                    />
                  </div>
                  <p className="text-xs text-violet-500 mt-1">
                    Este valor será somado automaticamente aos serviços que utilizarem IA
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingSpecialty ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Especialidade
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, specialty: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a especialidade <strong>{deleteConfirm.specialty?.name}</strong>?
              Esta ação não pode ser desfeita.
              {deleteConfirm.specialty && deleteConfirm.specialty.activeNomades > 0 && (
                <span className="block mt-2 text-amber-600">
                  <strong>Atenção:</strong> Existem {deleteConfirm.specialty.activeNomades} nômades ativos nesta
                  especialidade.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
