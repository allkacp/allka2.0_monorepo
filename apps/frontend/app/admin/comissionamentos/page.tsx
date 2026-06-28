// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Users, TrendingUp, Settings, Plus, Edit, Save, X } from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import { PageHeader } from "@/components/page-header"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const categories = [
  {
    id: 1,
    name: "Design Gráfico",
    leader: "Maria Silva",
    fixedSalary: 4500,
    commissionRate: 15,
    activeNomades: 12,
    monthlyRevenue: 28500,
    status: "active",
  },
  {
    id: 2,
    name: "Copywriting",
    leader: "João Santos",
    fixedSalary: 4000,
    commissionRate: 12,
    activeNomades: 8,
    monthlyRevenue: 19200,
    status: "active",
  },
  {
    id: 3,
    name: "Social Media",
    leader: "Ana Costa",
    fixedSalary: 3800,
    commissionRate: 18,
    activeNomades: 15,
    monthlyRevenue: 32100,
    status: "active",
  },
  {
    id: 4,
    name: "Desenvolvimento Web",
    leader: "Carlos Lima",
    fixedSalary: 5500,
    commissionRate: 10,
    activeNomades: 6,
    monthlyRevenue: 45600,
    status: "active",
  },
  {
    id: 5,
    name: "Edição de Vídeo",
    leader: "Não atribuído",
    fixedSalary: 0,
    commissionRate: 0,
    activeNomades: 4,
    monthlyRevenue: 12800,
    status: "pending",
  },
]

const globalSettings = {
  minFixedSalary: 3000,
  maxFixedSalary: 8000,
  minCommissionRate: 8,
  maxCommissionRate: 25,
  leaderBonusThreshold: 50000,
  leaderBonusRate: 5,
}

export default function ComissionamentosPage() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isEditingGlobal, setIsEditingGlobal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting()

  const handleSaveCategory = (categoryData) => {
    setEditingCategory(null)
  }

  const handleAssignLeader = (categoryId, leaderId) => {
  }

  return (
    <div className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-6">
      <PageHeader
        title="Gestão de Comissionamentos"
        description="Configure remuneração e comissões dos líderes por categoria."
        actions={<>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsEditingGlobal(true)}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Settings className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Configurações Globais
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Configurações globais de comissionamento</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      {/* Global Settings Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">Configurações Globais</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">R$ {globalSettings.minFixedSalary.toLocaleString()}</p>
              <p className="text-sm text-blue-600">Salário Mín.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">R$ {globalSettings.maxFixedSalary.toLocaleString()}</p>
              <p className="text-sm text-blue-600">Salário Máx.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">
                {globalSettings.minCommissionRate}% - {globalSettings.maxCommissionRate}%
              </p>
              <p className="text-sm text-blue-600">Faixa Comissão</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{globalSettings.leaderBonusRate}%</p>
              <p className="text-sm text-blue-600">Bônus Líder</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categorias e Líderes</TabsTrigger>
          <TabsTrigger value="performance">Performance e Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`${category.status === "pending" ? "border-orange-200 bg-orange-50" : "border-gray-200"}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        category.status === "active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-orange-50 text-orange-700 border-orange-200"
                      }
                    >
                      {category.status === "active" ? "Ativo" : "Pendente"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Líder Atual</p>
                    <p className="font-medium text-gray-900">
                      {category.leader === "Não atribuído" ? (
                        <span className="text-orange-600">Não atribuído</span>
                      ) : (
                        category.leader
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Salário Fixo</p>
                      <p className="font-semibold text-green-600">
                        {category.fixedSalary > 0 ? `R$ ${category.fixedSalary.toLocaleString()}` : "Não definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Comissão</p>
                      <p className="font-semibold text-blue-600">
                        {category.commissionRate > 0 ? `${category.commissionRate}%` : "Não definido"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nômades</p>
                      <p className="font-medium">{category.activeNomades}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Receita Mensal</p>
                      <p className="font-medium text-gray-900">R$ {category.monthlyRevenue.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {category.status === "pending" ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="flex-1 btn-brand">
                            <Plus className="h-4 w-4 mr-1" />
                            Atribuir Líder
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Atribuir Líder - {category.name}</DialogTitle>
                            <DialogDescription>
                              Selecione um nômade qualificado para liderar esta categoria.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="leader-select">Selecionar Líder</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Escolha um nômade qualificado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nomade1">Pedro Oliveira (Nível 5)</SelectItem>
                                  <SelectItem value="nomade2">Lucia Ferreira (Nível 4)</SelectItem>
                                  <SelectItem value="nomade3">Roberto Silva (Nível 5)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="fixed-salary">Salário Fixo (R$)</Label>
                                <Input
                                  id="fixed-salary"
                                  type="number"
                                  placeholder="4500"
                                  min={globalSettings.minFixedSalary}
                                  max={globalSettings.maxFixedSalary}
                                />
                              </div>
                              <div>
                                <Label htmlFor="commission-rate">Taxa Comissão (%)</Label>
                                <Input
                                  id="commission-rate"
                                  type="number"
                                  placeholder="15"
                                  min={globalSettings.minCommissionRate}
                                  max={globalSettings.maxCommissionRate}
                                />
                              </div>
                            </div>
                            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                              Confirmar Atribuição
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Pago em Salários</p>
                    <p className="text-2xl font-bold text-green-700">R$ 17.8k</p>
                    <p className="text-xs text-green-600 mt-1">Este mês</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total em Comissões</p>
                    <p className="text-2xl font-bold text-blue-700">R$ 19.2k</p>
                    <p className="text-xs text-blue-600 mt-1">Este mês</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Líderes Ativos</p>
                    <p className="text-2xl font-bold text-purple-700">4</p>
                    <p className="text-xs text-purple-600 mt-1">De 5 categorias</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Receita Total</p>
                    <p className="text-2xl font-bold text-orange-700">R$ 138.2k</p>
                    <p className="text-xs text-orange-600 mt-1">Este mês</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Detalhada por Líder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-150">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3"><SortableHeader label="Líder" field="leader" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="text-left p-3"><SortableHeader label="Categoria" field="name" type="status" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["Design Gráfico","Copywriting","Social Media","Desenvolvimento Web","Edição de Vídeo"]} /></th>
                      <th className="text-left p-3"><SortableHeader label="Salário Fixo" field="fixedSalary" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="text-left p-3"><SortableHeader label="Comissão" field="commissionRate" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="text-left p-3">Total Ganho</th>
                      <th className="text-left p-3"><SortableHeader label="Receita Gerada" field="monthlyRevenue" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="text-left p-3">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortData(categories
                      .filter((c) => c.status === "active"))
                      .map((category) => {
                        const commissionEarned = (category.monthlyRevenue * category.commissionRate) / 100
                        const totalEarned = category.fixedSalary + commissionEarned
                        const roi = (((category.monthlyRevenue - totalEarned) / totalEarned) * 100).toFixed(1)

                        return (
                          <tr key={category.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{category.leader}</td>
                            <td className="p-3">{category.name}</td>
                            <td className="p-3 text-green-600">R$ {category.fixedSalary.toLocaleString()}</td>
                            <td className="p-3 text-blue-600">R$ {commissionEarned.toLocaleString()}</td>
                            <td className="p-3 font-semibold">R$ {totalEarned.toLocaleString()}</td>
                            <td className="p-3">R$ {category.monthlyRevenue.toLocaleString()}</td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={
                                  Number.parseFloat(roi) > 200
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : Number.parseFloat(roi) > 100
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                }
                              >
                                {roi}%
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Comissionamento - {editingCategory.name}</DialogTitle>
              <DialogDescription>Ajuste o salário fixo e taxa de comissão do líder.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-leader">Líder Atual</Label>
                <Input id="edit-leader" value={editingCategory.leader} disabled className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-fixed-salary">Salário Fixo (R$)</Label>
                  <Input
                    id="edit-fixed-salary"
                    type="number"
                    defaultValue={editingCategory.fixedSalary}
                    min={globalSettings.minFixedSalary}
                    max={globalSettings.maxFixedSalary}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Faixa: R$ {globalSettings.minFixedSalary.toLocaleString()} - R${" "}
                    {globalSettings.maxFixedSalary.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-commission-rate">Taxa Comissão (%)</Label>
                  <Input
                    id="edit-commission-rate"
                    type="number"
                    defaultValue={editingCategory.commissionRate}
                    min={globalSettings.minCommissionRate}
                    max={globalSettings.maxCommissionRate}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Faixa: {globalSettings.minCommissionRate}% - {globalSettings.maxCommissionRate}%
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => handleSaveCategory(editingCategory)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Global Settings Dialog */}
      {isEditingGlobal && (
        <Dialog open={isEditingGlobal} onOpenChange={setIsEditingGlobal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações Globais de Comissionamento</DialogTitle>
              <DialogDescription>Defina os parâmetros gerais para remuneração de líderes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-salary">Salário Mínimo (R$)</Label>
                  <Input id="min-salary" type="number" defaultValue={globalSettings.minFixedSalary} />
                </div>
                <div>
                  <Label htmlFor="max-salary">Salário Máximo (R$)</Label>
                  <Input id="max-salary" type="number" defaultValue={globalSettings.maxFixedSalary} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-commission">Comissão Mínima (%)</Label>
                  <Input id="min-commission" type="number" defaultValue={globalSettings.minCommissionRate} />
                </div>
                <div>
                  <Label htmlFor="max-commission">Comissão Máxima (%)</Label>
                  <Input id="max-commission" type="number" defaultValue={globalSettings.maxCommissionRate} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bonus-threshold">Threshold Bônus (R$)</Label>
                  <Input id="bonus-threshold" type="number" defaultValue={globalSettings.leaderBonusThreshold} />
                </div>
                <div>
                  <Label htmlFor="bonus-rate">Taxa Bônus (%)</Label>
                  <Input id="bonus-rate" type="number" defaultValue={globalSettings.leaderBonusRate} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 btn-brand"
                  onClick={() => setIsEditingGlobal(false)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
                <Button variant="outline" onClick={() => setIsEditingGlobal(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
