
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  TrendingUp,
  DollarSign,
  Calculator,
  Percent,
  Plus,
  Edit,
  Trash2,
  Award,
  Receipt,
  BadgeDollarSign,
  Info,
  AlertCircle,
  Building2,
  X,
  FileText,
  Target,
  Scale,
  BarChart3,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { usePricing, type PricingComponent, type CommissionApplyOn, type ProductCategory } from "@/hooks/use-pricing"
import { useSpecialties } from "@/lib/contexts/specialty-context"
import { useSidebar } from "@/contexts/sidebar-context"
import PageHeader from "@/components/page-header"

const PrecificacaoPage = () => {
  const { sidebarWidth } = useSidebar()
  const { pricingComponents, addComponent, updateComponent, deleteComponent, getActiveComponents } = usePricing()
  const { specialties } = useSpecialties()
  const [activeTab, setActiveTab] = useState("rates")
  const [isOpen, setIsOpen] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [selectedType, setSelectedType] = useState<"commission" | "fee" | "tax" | "margin" | null>(null)
  const [editingItem, setEditingItem] = useState<PricingComponent | null>(null)
  const [companyType, setCompanyType] = useState<"partners" | "nomades" | null>(null)
  const [showSpecialtiesModal, setShowSpecialtiesModal] = useState(false)
  const [editingSpecialty, setEditingSpecialty] = useState<any>(null)
  const [isSpecialtySaving, setIsSpecialtySaving] = useState(false)
  const [deleteSpecialtyConfirm, setDeleteSpecialtyConfirm] = useState<{ isOpen: boolean; specialty: any | null }>({ isOpen: false, specialty: null })
  const [specialtyFormData, setSpecialtyFormData] = useState({
    name: "",
    iniciante: "",
    junior: "",
    pleno: "",
    senior: "",
    aiEnabled: false,
    aiFixedValue: "",
  })
const [formData, setFormData] = useState({
  name: "",
  value: 0,
  valueType: "percentage" as "percentage" | "fixed",
  appliesTo: [] as string[],
  description: "",
  isActive: true,
  applyOn: "final_value" as CommissionApplyOn,
  productCategories: ["all"] as ProductCategory[],
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    id: string
    name: string
  }>({ isOpen: false, id: "", name: "" })

  const specialtyLevels = ["Iniciante", "Júnior", "Pleno", "Sênior"]
  const partnerLevels = ["Bronze", "Prata", "Ouro", "Platina", "Diamante"]
  const nomadeLevels = ["Nível 1", "Nível 2", "Nível 3", "Nível 4", "Nível 5"]

  const availableLevels =
    selectedType === "commission" ? (companyType === "partners" ? partnerLevels : nomadeLevels) : specialtyLevels

  const levelOptions =
    selectedType === "commission"
      ? companyType === "partners"
        ? partnerLevels
        : companyType === "nomades"
          ? nomadeLevels
          : []
      : specialtyLevels

  const handleOpenSheet = (item?: PricingComponent, type?: string) => {
    if (item) {
      setEditingItem(item)
      const isPartner = partnerLevels.some((level) => item.appliesTo.includes(level))
      const isNomade = nomadeLevels.some((level) => item.appliesTo.includes(level))
      setCompanyType(isPartner ? "partners" : isNomade ? "nomades" : null)
      setSelectedType(item.type)
setFormData({
  name: item.name,
  value: item.value,
  valueType: item.valueType,
  appliesTo: item.appliesTo,
  description: item.description,
  isActive: item.isActive,
  applyOn: item.applyOn || "final_value",
  productCategories: item.productCategories || ["all"],
  })
      setShowTypeModal(false)
      setIsOpen(true)
    } else {
      if (!type) {
        setShowTypeModal(true)
        return
      }
      setSelectedType(type as "commission" | "fee" | "tax")
setEditingItem(null)
  setCompanyType(null)
  setFormData({
  name: "",
  value: 0,
  valueType: "percentage",
  appliesTo: [],
  description: "",
  isActive: true,
  applyOn: "final_value",
  productCategories: ["all"],
  })
  setShowTypeModal(false)
  setIsOpen(true)
    }
  }

  const handleTypeSelect = (type: "commission" | "fee" | "tax" | "margin" | "comissao" | "taxa" | "imposto" | "margem") => {
    let actualType: "commission" | "fee" | "tax" | "margin"
    switch (type) {
      case "comissao":
        actualType = "commission"
        break
      case "taxa":
        actualType = "fee"
        break
      case "imposto":
        actualType = "tax"
        break
      case "margem":
        actualType = "margin"
        break
      default:
        actualType = type
    }
    setSelectedType(actualType)
    setShowTypeModal(false)
    setIsOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || formData.value === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o valor",
        variant: "destructive",
      })
      return
    }

    if (formData.appliesTo.length === 0) {
      toast({
        title: "Nível obrigatório",
        description: "Selecione pelo menos um nível",
        variant: "destructive",
      })
      return
    }

    const componentType =
      selectedType || (activeTab === "commissions" ? "commission" : activeTab === "fees" ? "fee" : "tax")

const newComponent: PricingComponent = {
  id: editingItem?.id || Date.now().toString(),
  name: formData.name,
  type: componentType,
  value: formData.value,
  valueType: formData.valueType,
  appliesTo: formData.appliesTo,
  description: formData.description,
  isActive: formData.isActive,
  ...(componentType === "commission" && { applyOn: formData.applyOn }),
  ...(componentType === "margin" && { productCategories: formData.productCategories }),
  }

    if (editingItem) {
      updateComponent(editingItem.id, newComponent)
      toast({
        title: "Componente atualizado",
        description: `${formData.name} foi atualizado com sucesso`,
      })
    } else {
      addComponent(newComponent)
      toast({
        title: "Componente criado",
        description: `${formData.name} foi criado com sucesso`,
      })
    }

setIsOpen(false)
  setShowTypeModal(false)
  setSelectedType(null)
  setEditingItem(null)
  setCompanyType(null)
  setFormData({
  name: "",
  value: 0,
  valueType: "percentage",
  appliesTo: [],
  description: "",
  isActive: true,
  applyOn: "final_value",
  productCategories: ["all"],
  })
  }

  const handleDelete = (id: string, name: string) => {
    deleteComponent(id)
    toast({
      title: "Componente removido",
      description: `${name} foi removido com sucesso`,
    })
    setDeleteConfirm({ isOpen: false, id: "", name: "" })
  }

  const handleToggleActive = (component: PricingComponent) => {
    updateComponent(component.id, { ...component, isActive: !component.isActive })
    toast({
      title: component.isActive ? "Componente desativado" : "Componente ativado",
      description: `${component.name} foi ${component.isActive ? "desativado" : "ativado"}`,
    })
  }

  const handleEdit = (component: PricingComponent) => {
    handleOpenSheet(component)
  }

  const getFilteredComponents = (type: string) => {
    return pricingComponents.filter((item) => item.type === type)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "commission":
        return "Comissões"
      case "fee":
        return "Taxas"
      case "tax":
        return "Impostos"
      case "margin":
        return "Margens"
      default:
        return ""
    }
  }

  const renderComponentCard = (component: PricingComponent) => (
    <Card
      key={component.id}
      className={`p-3 hover:shadow-md transition-all border-l-4 bg-white ${
        component.type === "commission"
          ? "border-l-green-500"
          : component.type === "fee"
            ? "border-l-blue-500"
            : component.type === "margin"
              ? "border-l-orange-500"
              : "border-l-purple-500"
      } ${!component.isActive ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm mb-0.5 truncate">{component.name}</h3>
          <p className="text-xs text-gray-600 line-clamp-2">{component.description}</p>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          <Switch
            checked={component.isActive}
            onCheckedChange={() => handleToggleActive(component)}
            className="scale-75"
          />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(component)}
              className="h-7 w-7 p-0 hover:bg-green-100"
            >
              <Edit className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteConfirm({ isOpen: true, id: component.id, name: component.name })}
              className="h-7 w-7 p-0 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <div className="flex flex-wrap gap-1">
          {component.appliesTo.slice(0, 2).map((level) => (
            <Badge key={level} variant="secondary" className="text-xs px-1.5 py-0">
              {level}
            </Badge>
          ))}
          {component.appliesTo.length > 2 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              +{component.appliesTo.length - 2}
            </Badge>
          )}
        </div>
        <Badge
          className={`text-xs font-semibold ${
            component.type === "commission"
              ? "bg-green-500 text-white"
              : component.type === "fee"
                ? "bg-blue-500 text-white"
                : "bg-purple-500 text-white"
          }`}
        >
          {component.valueType === "percentage" ? (
            <>
              <Percent className="h-3 w-3 mr-0.5" />
              {component.value}%
            </>
          ) : (
            <>
              <DollarSign className="h-3 w-3 mr-0.5" />
              R$ {component.value.toFixed(2)}
            </>
          )}
        </Badge>
      </div>
    </Card>
  )

  return (
    <div className="flex flex-col space-y-3">
      <PageHeader
        title={
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Precificação
          </span>
        }
        description="Gerencie comissões, taxas, impostos e custos"
      />

      <Accordion type="single" collapsible className="mb-1">
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="bg-white hover:bg-slate-50 rounded-lg px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Estatísticas e Métricas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded-md shadow-sm mb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-blue-800 text-xs">
                  <strong>Importante:</strong> Todas as alterações afetam automaticamente o cálculo de preços.
                  Componentes inativos não serão aplicados.
                </p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">Comissões Ativas</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {getFilteredComponents("commission").filter((c) => c.isActive).length}
                </p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-900">Taxas Ativas</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {getFilteredComponents("fee").filter((c) => c.isActive).length}
                </p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-900">Impostos Ativos</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {getFilteredComponents("tax").filter((c) => c.isActive).length}
                </p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-900">Total Componentes</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{pricingComponents.length}</p>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="relative">
          <TabsList className="w-max grid grid-cols-2 gap-1 bg-transparent p-0 h-auto">
            <TabsTrigger
              value="rates"
              className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
            >
              <Calculator className="h-4 w-4 mr-1.5 inline" />
              Taxas e Comissões
            </TabsTrigger>
            <TabsTrigger
              value="specialties"
              className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
            >
              <Award className="h-4 w-4 mr-1.5 inline" />
              Especialidades
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rates" className="space-y-3">
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Comissões</h3>
                    <p className="text-xs text-gray-600">{getFilteredComponents("commission").length} itens</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSheet(undefined, "commission")}
                  className="text-green-600 border-green-300 hover:bg-green-50 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Comissão
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {pricingComponents
                  .filter((component) => component.type === "commission")
                  .map((component) => renderComponentCard(component))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Taxas</h3>
                    <p className="text-xs text-gray-600">{getFilteredComponents("fee").length} itens</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSheet(undefined, "fee")}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Taxa
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {pricingComponents
                  .filter((component) => component.type === "fee")
                  .map((component) => renderComponentCard(component))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Scale className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Impostos</h3>
                    <p className="text-xs text-gray-600">{getFilteredComponents("tax").length} itens</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSheet(undefined, "tax")}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Imposto
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {pricingComponents
                  .filter((component) => component.type === "tax")
                  .map((component) => renderComponentCard(component))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-3">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-blue-800 text-xs">
                <strong>Visualização de Especialidades:</strong> Esta aba exibe as especialidades cadastradas em{" "}
                <a href="/admin/especialidades" className="underline font-semibold hover:text-blue-900">
                  Gestão de Especialidades
                </a>
                . Para adicionar, editar ou remover, acesse a página de gestão.
              </p>
            </div>
          </div>

          <Card className="p-4 bg-white shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Custo por Hora das Especialidades</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Valores de referência utilizados no cálculo de preços dos produtos
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent border-green-300 text-green-600 hover:bg-green-50 h-8 text-xs shrink-0"
              >
                <a href="/admin/especialidades">
                  <BadgeDollarSign className="h-3.5 w-3.5" />
                  Gerenciar
                </a>
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <th className="text-left p-3 font-semibold text-xs">Especialidade</th>
                    <th className="text-center p-3 font-semibold text-xs">
                      Iniciante
                      <br />
                      <span className="text-xs font-normal opacity-90">R$/h</span>
                    </th>
                    <th className="text-center p-3 font-semibold text-xs">
                      Júnior
                      <br />
                      <span className="text-xs font-normal opacity-90">R$/h</span>
                    </th>
                    <th className="text-center p-3 font-semibold text-xs">
                      Pleno
                      <br />
                      <span className="text-xs font-normal opacity-90">R$/h</span>
                    </th>
                    <th className="text-center p-3 font-semibold text-xs">
                      Sênior
                      <br />
                      <span className="text-xs font-normal opacity-90">R$/h</span>
                    </th>
                    <th className="text-center p-3 font-semibold text-xs">
                      Nômades
                      <br />
                      <span className="text-xs font-normal opacity-90">Ativos</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specialties.map((specialty, index) => (
                    <tr
                      key={specialty.id}
                      className={`border-b hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-xs">{specialty.name}</span>
                      </td>
                      <td className="p-3 text-center text-gray-700 font-semibold text-xs">
                        R$ {specialty.rates.iniciante.toFixed(2)}
                      </td>
                      <td className="p-3 text-center text-gray-700 font-semibold text-xs">
                        R$ {specialty.rates.junior.toFixed(2)}
                      </td>
                      <td className="p-3 text-center text-gray-700 font-semibold text-xs">
                        R$ {specialty.rates.pleno.toFixed(2)}
                      </td>
                      <td className="p-3 text-center text-gray-700 font-semibold text-xs">
                        R$ {specialty.rates.senior.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-green-50 text-green-700 border-green-200 rounded-lg px-2 py-0.5 font-semibold text-xs">
                          {specialty.activeNomades}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-inner">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4" />
                Como funciona o cálculo de preços
              </h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5 shrink-0">1.</span>
                  <span>
                    <strong>Custo Base:</strong> Valor hora da especialidade × Horas estimadas da etapa
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5 shrink-0">2.</span>
                  <span>
                    <strong>Comissões:</strong> Aplicadas automaticamente conforme nível da especialidade
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5 shrink-0">3.</span>
                  <span>
                    <strong>Taxas e Impostos:</strong> Adicionados ao subtotal para compor o preço final
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5 shrink-0">4.</span>
                  <span>
                    <strong>Atualização Automática:</strong> Alterações aqui recalculam os preços de todos os produtos
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pricing Component Sheet - Modal único para adicionar/editar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 border-l-0 shadow-2xl max-w-none w-full"
          style={{
            width: `calc(100vw - ${sidebarWidth}px)`,
            minWidth: "850px",
          }}
        >
          <div className="h-full flex flex-col">
            {/* Header com gradiente */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
              <SheetTitle className="text-xl font-bold text-white">
                {editingItem ? "Editar" : "Adicionar"}{" "}
                {selectedType === "commission" ? "Comissão" : selectedType === "fee" ? "Taxa" : "Imposto"}
              </SheetTitle>
              <p className="text-xs text-blue-100 mt-1">Preencha as informações do componente de precificação</p>
              <SheetClose className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-1.5 transition-colors">
                <X className="h-4 w-4 text-white" />
              </SheetClose>
            </div>

            {/* Formulário com cards */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Card de Informações Básicas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <Label htmlFor="name" className="text-xs font-medium">
                        Nome *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Comissão padrão"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label htmlFor="value" className="text-xs font-medium">
                        Valor *
                      </Label>
                      <div className="relative mt-1">
                        {/* Display % or R$ based on valueType */}
                        {formData.valueType === "percentage" ? (
                          <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        )}
                        <Input
                          id="value"
                          type="number"
                          value={formData.value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              value: Number.parseFloat(e.target.value),
                            })
                          }
                          placeholder="15"
                          className="pl-9 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="description" className="text-xs font-medium">
                        Descrição
                      </Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descreva o propósito desta taxa..."
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Card de Tipo de Empresa (apenas para comissões) */}
                {selectedType === "commission" && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      Tipo de Empresa
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Selecione o tipo de empresa para mostrar os níveis corretos
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCompanyType("partners")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          companyType === "partners"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-semibold">Agências Partners</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Bronze, Prata, Ouro, Platina, Diamante
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyType("nomades")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          companyType === "nomades"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-semibold">Nômades</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nível 1, 2, 3, 4, 5</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Card de Base de Aplicacao (apenas para comissoes) */}
                {selectedType === "commission" && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Base de Aplicacao
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Selecione sobre qual valor a comissao deve ser calculada
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, applyOn: "final_value" })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.applyOn === "final_value"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold">Valor Final</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Preco com margem, taxas e impostos
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, applyOn: "value_without_fees_taxes" })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.applyOn === "value_without_fees_taxes"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold">Valor sem Taxas e Impostos</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Preco base com margem apenas
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, applyOn: "value_without_taxes" })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.applyOn === "value_without_taxes"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold">Valor sem Impostos</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Preco com margem e taxas, sem impostos
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, applyOn: "specialist_value" })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.applyOn === "specialist_value"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold">Valor do Especialista</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Valor que o especialista recebe
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Card de Níveis */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Aplicável aos Níveis
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Selecione os níveis onde este componente será aplicado
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {levelOptions.map((level) => (
                      <label
                        key={level}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.appliesTo.includes(level)
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : selectedType === "commission" && !companyType
                              ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.appliesTo.includes(level)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                appliesTo: [...formData.appliesTo, level],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                appliesTo: formData.appliesTo.filter((l) => l !== level),
                              })
                            }
                          }}
                          disabled={selectedType === "commission" && !companyType}
                          className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-xs font-medium capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                  {selectedType === "commission" && !companyType && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Selecione o tipo de empresa primeiro
                    </p>
                  )}
                </div>

                {/* Card de Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">Status Ativo</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Ativar este componente imediatamente após criação
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer com botões */}
            <div className="border-t bg-white dark:bg-gray-800 px-6 py-3 flex justify-end gap-2.5 shadow-lg">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="px-5 h-9 text-sm">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="px-5 h-9 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {editingItem ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, id: "", name: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PrecificacaoPage
