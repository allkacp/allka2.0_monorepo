// @ts-nocheck
import { useState, useEffect, useCallback } from "react"
import { useSidebar } from "@/contexts/sidebar-context"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  Edit, Plus, Trash2, TrendingUp, DollarSign, Star, CheckCircle2, Award, X,
  Users, Percent, Gift, Crown, Zap, Target, BarChart3,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"

const LEVEL_THEMES: Record<string, {
  accent: string; headerBg: string; iconBg: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  statBg: string; statBorder: string; cardBorder: string;
}> = {
  Bronze: {
    accent: "border-l-amber-500",
    headerBg: "bg-gradient-to-r from-amber-50 via-orange-50/60 to-white",
    iconBg: "bg-amber-100",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-700",
    statBg: "bg-amber-50/70",
    statBorder: "border-amber-100",
    cardBorder: "border-slate-200 hover:border-amber-300",
  },
  Silver: {
    accent: "border-l-slate-400",
    headerBg: "bg-gradient-to-r from-slate-50 via-slate-100/40 to-white",
    iconBg: "bg-slate-100",
    badgeBg: "bg-slate-50",
    badgeBorder: "border-slate-300",
    badgeText: "text-slate-600",
    statBg: "bg-slate-50/70",
    statBorder: "border-slate-200",
    cardBorder: "border-slate-200 hover:border-slate-400",
  },
  Gold: {
    accent: "border-l-yellow-500",
    headerBg: "bg-gradient-to-r from-yellow-50 via-amber-50/60 to-white",
    iconBg: "bg-yellow-100",
    badgeBg: "bg-yellow-50",
    badgeBorder: "border-yellow-200",
    badgeText: "text-yellow-700",
    statBg: "bg-yellow-50/70",
    statBorder: "border-yellow-100",
    cardBorder: "border-slate-200 hover:border-yellow-300",
  },
  Platinum: {
    accent: "border-l-sky-500",
    headerBg: "bg-gradient-to-r from-sky-50 via-blue-50/40 to-white",
    iconBg: "bg-sky-100",
    badgeBg: "bg-sky-50",
    badgeBorder: "border-sky-200",
    badgeText: "text-sky-700",
    statBg: "bg-sky-50/70",
    statBorder: "border-sky-100",
    cardBorder: "border-slate-200 hover:border-sky-300",
  },
  Diamond: {
    accent: "border-l-violet-500",
    headerBg: "bg-gradient-to-r from-violet-50 via-purple-50/40 to-white",
    iconBg: "bg-violet-100",
    badgeBg: "bg-violet-50",
    badgeBorder: "border-violet-200",
    badgeText: "text-violet-700",
    statBg: "bg-violet-50/70",
    statBorder: "border-violet-100",
    cardBorder: "border-slate-200 hover:border-violet-300",
  },
}

const DEFAULT_THEME = {
  accent: "border-l-blue-500",
  headerBg: "bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white",
  iconBg: "bg-blue-100",
  badgeBg: "bg-blue-50",
  badgeBorder: "border-blue-200",
  badgeText: "text-blue-700",
  statBg: "bg-blue-50/70",
  statBorder: "border-blue-100",
  cardBorder: "border-slate-200 hover:border-blue-300",
}

// Levels are loaded from API in the component

export default function NiveisPage() {
  const { sidebarWidth } = useSidebar()
  const [partnerLevels, setPartnerLevels] = useState<any[]>([])
  const [editingLevel, setEditingLevel] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: "" })

  // Load levels from API
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res: any = await apiClient.getLevels()
        if (cancelled) return
        const data = res.data || (Array.isArray(res) ? res : [])
        setPartnerLevels(data)
      } catch (err) {
        console.error("[NiveisPage] Failed to load levels:", err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSaveLevel = async (levelData: any) => {
    try {
      if (levelData.id) {
        const res: any = await apiClient.updateLevel(levelData.id, levelData)
        setPartnerLevels((levels) => levels.map((level) => (level.id === levelData.id ? (res || levelData) : level)))
      } else {
        const res: any = await apiClient.createLevel(levelData)
        setPartnerLevels((levels) => [...levels, res || { ...levelData, id: Date.now() }])
      }
    } catch (err) {
      console.error("[NiveisPage] Failed to save level:", err)
    }
    setEditingLevel(null)
    setIsDialogOpen(false)
  }

  const handleDeleteLevel = async (id: number) => {
    try {
      await apiClient.deleteLevel(id)
    } catch (err) {
      console.error("[NiveisPage] Failed to delete level:", err)
    }
    setPartnerLevels((levels) => levels.filter((level) => level.id !== id))
  }

  const confirmDelete = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name })
  }

  const openEditDialog = (level?: any) => {
    setEditingLevel(
      level || {
        name: "",
        description: "",
        icon: "🌟",
        color: "#4F46E5",
        gradient: "from-blue-600 to-cyan-600",
        min_mrr: 0,
        max_mrr: 0,
        led_agencies_min: 0,
        led_agencies_mrr_min: 0,
        premium_project_limit: 0,
        commission_rate: 0,
        extra_discount: 10,
        receives_leads_premium: false,
        requires_partner: false,
        level_up_bonus_credits: 0,
        benefits: [],
      },
    )
    setIsDialogOpen(true)
  }

  const formatMrrRange = (min: number, max: number | null) => {
    if (min === 0 && max !== null) return `até R$ ${max.toLocaleString("pt-BR")}`
    if (max === null) return `acima de R$ ${(min - 1).toLocaleString("pt-BR")}`
    return `R$ ${min.toLocaleString("pt-BR")} a ${max.toLocaleString("pt-BR")}`
  }

  const formatPremiumLimit = (level: any) => {
    if (!level.premium_project_limit && level.name === "Diamond") return "Acima de R$ 6.000"
    if (!level.premium_project_limit) return "—"
    return `até R$ ${level.premium_project_limit.toLocaleString("pt-BR")}`
  }

  return (
    <div className="space-y-6 pt-0 pl-0 pr-0">
      <PageHeader
        title="Níveis do Programa Partner"
        description="Configure os 5 níveis do Programa Allka Partners com critérios de progressão, benefícios e regras de comissão"
        actions={
          <Button onClick={() => openEditDialog()} className="btn-brand">
            <Plus className="h-4 w-4 mr-2" />
            Novo Nível
          </Button>
        }
      />

      <div className="grid gap-4">
        {partnerLevels.map((level, index) => {
          const theme = LEVEL_THEMES[level.name] ?? DEFAULT_THEME
          return (
            <div
              key={level.id}
              className="animate-in fade-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Card className={`overflow-hidden bg-white border border-l-4 ${theme.accent} ${theme.cardBorder} shadow-sm hover:shadow-md transition-all duration-200`}>

                <CardHeader className={`p-4 pb-3 ${theme.headerBg} border-b border-slate-100`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center text-xl shadow-sm`}>
                        {level.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-800">{level.name}</h3>
                          {level.requires_partner ? (
                            <Badge className={`border text-xs font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                              <Crown className="h-3 w-3 mr-1" />
                              Requer Partner
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 bg-white">
                              Todas as agências
                            </Badge>
                          )}
                          {level.receives_leads_premium && (
                            <Badge className="border text-xs font-medium bg-emerald-50 border-emerald-200 text-emerald-700">
                              <Zap className="h-3 w-3 mr-1" />
                              Leads Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{level.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(level)}
                        className="h-8 w-8 p-0 border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(level.id, level.name)}
                        className="h-8 w-8 p-0 border-red-100 bg-white hover:bg-red-50 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 space-y-4">
                  {/* Critérios de progressão */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Critérios de Progressão</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className={`rounded-lg p-3 border ${theme.statBg} ${theme.statBorder}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">MRR Consumo</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{formatMrrRange(level.min_mrr, level.max_mrr)}</p>
                      </div>
                      <div className={`rounded-lg p-3 border ${theme.statBg} ${theme.statBorder}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Ag. Lideradas</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {level.led_agencies_min > 0 ? `${level.led_agencies_min} ativas` : "—"}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border ${theme.statBg} ${theme.statBorder}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">MRR Lideradas</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {level.led_agencies_mrr_min > 0
                            ? `R$ ${level.led_agencies_mrr_min.toLocaleString("pt-BR")}`
                            : "—"}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border ${theme.statBg} ${theme.statBorder}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Proj. Premium</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{formatPremiumLimit(level)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Perks */}
                  <div className="flex flex-wrap gap-2">
                    {level.commission_rate > 0 && (
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                        <TrendingUp className="h-3 w-3" />
                        {level.commission_rate}% comissão sobre MRR das lideradas
                      </span>
                    )}
                    {level.extra_discount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium bg-emerald-50 border-emerald-200 text-emerald-700">
                        <Percent className="h-3 w-3" />
                        +{level.extra_discount}% desconto adicional nas contratações
                      </span>
                    )}
                    {level.level_up_bonus_credits > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium bg-purple-50 border-purple-200 text-purple-700">
                        <Gift className="h-3 w-3" />
                        R$ {level.level_up_bonus_credits.toLocaleString("pt-BR")} em créditos ao atingir nível
                      </span>
                    )}
                  </div>

                  {/* Benefícios */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Benefícios desbloqueados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {level.benefits.map((benefit, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                        >
                          <CheckCircle2 className="h-3 w-3 opacity-60" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 border-0"
          style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)` }}
        >
          <div className="h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-linear-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
                  <Award className="h-4 w-4 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingLevel?.id ? "Editar Nível" : "Novo Nível Partner"}
                  </SheetTitle>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Configure critérios, benefícios e regras do nível</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="shrink-0 h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
              {editingLevel && (
                <LevelForm level={editingLevel} onSave={handleSaveLevel} onCancel={() => setIsDialogOpen(false)} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, name: "" })}
        onConfirm={() => {
          handleDeleteLevel(deleteDialog.id!)
          setDeleteDialog({ open: false, id: null, name: "" })
        }}
        title="Excluir nível"
        message={`Tem certeza que deseja excluir o nível "${deleteDialog.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
      />
    </div>
  )
}

const ICON_SUGGESTIONS = ["🥉", "🥈", "🥇", "💎", "🏆", "⭐", "🚀", "💫", "🌟", "👑", "🎯", "🔥", "💼", "🎖️"]
const COLOR_PRESETS = [
  { label: "Bronze",   value: "#CD7F32" },
  { label: "Prata",    value: "#94A3B8" },
  { label: "Ouro",     value: "#F59E0B" },
  { label: "Platina",  value: "#38BDF8" },
  { label: "Diamante", value: "#8B5CF6" },
  { label: "Esmeralda",value: "#10B981" },
  { label: "Rubi",     value: "#EF4444" },
  { label: "Índigo",   value: "#4F46E5" },
]

function LevelForm({ level, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({ icon: "🌟", ...level })
  const [benefits, setBenefits] = useState<string[]>(level.benefits || [])
  const [newBenefit, setNewBenefit] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (key: string, value: any) => {
    setFormData((f: any) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Nome é obrigatório"
    if (Number(formData.min_mrr) < 0) e.min_mrr = "Valor inválido"
    if (Number(formData.commission_rate) < 0 || Number(formData.commission_rate) > 100) e.commission_rate = "Entre 0 e 100"
    if (Number(formData.extra_discount) < 0 || Number(formData.extra_discount) > 100) e.extra_discount = "Entre 0 e 100"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...formData, benefits })
  }

  const addBenefit = () => {
    const trimmed = newBenefit.trim()
    if (trimmed) { setBenefits((b) => [...b, trimmed]); setNewBenefit("") }
  }

  const removeBenefit = (i: number) => setBenefits((b) => b.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-5">

      {/* Preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
          style={{ backgroundColor: formData.color + "22", border: `2px solid ${formData.color}55` }}
        >
          {formData.icon || "🌟"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {formData.name || <span className="text-slate-400 font-normal">Nome do nível</span>}
          </p>
          <p className="text-xs text-slate-500 truncate">{formData.description || "Descrição do nível"}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {Number(formData.commission_rate) > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {formData.commission_rate}% comissão
            </span>
          )}
          {formData.receives_leads_premium && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Leads Premium
            </span>
          )}
        </div>
        <div className="shrink-0 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: formData.color }} />
      </div>

      {/* Identidade */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Identidade</p>
        <div className="grid grid-cols-[1fr,80px,52px] gap-3 items-start">
          <div>
            <Label className="text-slate-700 text-sm font-medium">Nome <span className="text-red-400">*</span></Label>
            <Input
              value={formData.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Gold, Platinum, Diamond..."
              className={`mt-1 border-slate-200 text-slate-900 ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Ícone</Label>
            <Input
              value={formData.icon}
              onChange={(e) => set("icon", e.target.value)}
              className="mt-1 border-slate-200 text-center text-lg"
              maxLength={2}
            />
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Cor</Label>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => set("color", e.target.value)}
              className="mt-1 border-slate-200 h-9 w-full cursor-pointer p-0.5"
            />
          </div>
        </div>

        <div className="mt-2.5 flex gap-1.5 flex-wrap">
          {ICON_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => set("icon", emoji)}
              className={`w-8 h-8 rounded-lg text-base transition-colors ${
                formData.icon === emoji ? "bg-blue-100 ring-1 ring-blue-400" : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => set("color", preset.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${
                formData.color === preset.value
                  ? "border-slate-400 bg-slate-100 font-medium"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.value }} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição */}
      <div>
        <Label className="text-slate-700 text-sm font-medium">Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descreva brevemente este nível e seu propósito..."
          rows={2}
          className="mt-1 border-slate-200 text-slate-900 resize-none"
        />
      </div>

      {/* Critérios de Progressão */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Critérios de Progressão</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">MRR Consumo Mínimo (R$)</Label>
            <Input
              type="number" min={0}
              value={formData.min_mrr}
              onChange={(e) => set("min_mrr", Number(e.target.value))}
              className={`mt-1 border-slate-200 text-slate-900 ${errors.min_mrr ? "border-red-400" : ""}`}
            />
            {errors.min_mrr && <p className="text-xs text-red-500 mt-0.5">{errors.min_mrr}</p>}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">MRR Consumo Máximo (R$)</Label>
            <Input
              type="number" min={0}
              value={formData.max_mrr ?? ""}
              onChange={(e) => set("max_mrr", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Deixe vazio para ilimitado"
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Vazio = sem limite (nível máximo)</p>
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Agências Lideradas (mín. ativas)</Label>
            <Input
              type="number" min={0}
              value={formData.led_agencies_min}
              onChange={(e) => set("led_agencies_min", Number(e.target.value))}
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Apenas agências com MRR no período</p>
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">MRR das Agências Lideradas (R$)</Label>
            <Input
              type="number" min={0}
              value={formData.led_agencies_mrr_min}
              onChange={(e) => set("led_agencies_mrr_min", Number(e.target.value))}
              className="mt-1 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Limite de Projeto Premium (R$)</Label>
            <Input
              type="number" min={0}
              value={formData.premium_project_limit ?? ""}
              onChange={(e) => set("premium_project_limit", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Vazio = acima do nível anterior"
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Valor máximo por lead premium recebido</p>
          </div>
        </div>
      </div>

      {/* Regras e Benefícios */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Regras e Benefícios</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">Comissão sobre MRR lideradas (%)</Label>
            <div className="relative mt-1">
              <Input
                type="number" min={0} max={100}
                value={formData.commission_rate}
                onChange={(e) => set("commission_rate", Number(e.target.value))}
                className={`border-slate-200 text-slate-900 pr-8 ${errors.commission_rate ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
            </div>
            {errors.commission_rate && <p className="text-xs text-red-500 mt-0.5">{errors.commission_rate}</p>}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Desconto Adicional nas Contratações (%)</Label>
            <div className="relative mt-1">
              <Input
                type="number" min={0} max={100}
                value={formData.extra_discount}
                onChange={(e) => set("extra_discount", Number(e.target.value))}
                className={`border-slate-200 text-slate-900 pr-8 ${errors.extra_discount ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
            </div>
            {errors.extra_discount && <p className="text-xs text-red-500 mt-0.5">{errors.extra_discount}</p>}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Créditos Bônus ao Atingir Nível (R$)</Label>
            <Input
              type="number" min={0}
              value={formData.level_up_bonus_credits}
              onChange={(e) => set("level_up_bonus_credits", Number(e.target.value))}
              className="mt-1 border-slate-200 text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">Recebe Leads Premium</p>
              <p className="text-xs text-slate-500">Partner recebe projetos com leads premium da Allka</p>
            </div>
            <Switch
              checked={!!formData.receives_leads_premium}
              onCheckedChange={(v) => set("receives_leads_premium", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">Requer Status Partner</p>
              <p className="text-xs text-slate-500">Acesso mediante convite formal da Allka</p>
            </div>
            <Switch
              checked={!!formData.requires_partner}
              onCheckedChange={(v) => set("requires_partner", v)}
            />
          </div>
        </div>
      </div>

      {/* Benefícios */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Benefícios
          {benefits.length > 0 && (
            <span className="ml-2 text-blue-500 normal-case font-normal">
              {benefits.length} adicionado{benefits.length > 1 ? "s" : ""}
            </span>
          )}
        </p>

        {benefits.length > 0 && (
          <div className="space-y-1.5 mb-2.5">
            {benefits.map((benefit, i) => (
              <div key={i} className="group flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1">{benefit}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit() } }}
            placeholder="Ex: Reunião trimestral com fundadores..."
            className="border-slate-200 text-slate-900 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addBenefit}
            disabled={!newBenefit.trim()}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        {benefits.length === 0 && (
          <p className="text-xs text-slate-400 mt-1.5">Pressione Enter ou clique em "Adicionar" para incluir cada benefício.</p>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <Button onClick={handleSave} className="btn-brand">
          {formData.id ? "Salvar alterações" : "Criar nível"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="border-slate-200 text-slate-600 hover:bg-slate-50">
          Cancelar
        </Button>
      </div>
    </div>
  )
}

