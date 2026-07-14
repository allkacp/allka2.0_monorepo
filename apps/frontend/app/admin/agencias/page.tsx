import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Search,
  Plus,
  Edit,
  Mail,
  Phone,
  Users,
  TrendingUp,
  Star,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useAgencies } from "@/hooks/useAgencies"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import { PageHeader } from "@/components/page-header"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ApiAgency {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  partner_level: string
  user_id: string
  user: { id: string; email: string; name: string } | null
  created_at: string
}

const PARTNER_LEVEL_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
}

const LEVEL_BADGE_CLASSES: Record<string, string> = {
  bronze: "bg-gradient-to-r from-orange-400 to-orange-600 text-white",
  silver: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
  platinum: "bg-gradient-to-r from-cyan-400 to-cyan-600 text-white",
  diamond: "bg-gradient-to-r from-purple-400 to-purple-600 text-white",
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 border-green-200",
  inativo: "bg-gray-100 text-gray-700 border-gray-200",
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
}

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativa",
  inativo: "Inativa",
  pendente: "Pendente",
}

const agencyInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

export default function AgenciasPage() {
  const { agencies: rawAgencies, loading, error, refetch, updateAgency } = useAgencies()
  const { toast } = useToast()

  const agencies = rawAgencies as ApiAgency[]

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Create dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    partner_level: "bronze",
  })

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState<ApiAgency | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "ativo",
    partner_level: "bronze",
  })

  const filteredAgencies = useMemo(() => {
    let list = agencies
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q) ||
          (a.phone || "").includes(q),
      )
    }
    if (selectedStatus !== "all") {
      list = list.filter((a) => a.status === selectedStatus)
    }
    return list
  }, [agencies, searchQuery, selectedStatus])

  const stats = useMemo(
    () => ({
      total: agencies.length,
      active: agencies.filter((a) => a.status === "ativo").length,
    }),
    [agencies],
  )

  const handleCreate = async () => {
    if (isSubmitting) return
    if (
      !createForm.organizationName.trim() ||
      !createForm.name.trim() ||
      !createForm.email.trim() ||
      !createForm.password
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome da agência, nome do usuário principal, e-mail e senha são obrigatórios.",
        variant: "destructive",
      })
      return
    }
    if (createForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha do usuário principal precisa ter ao menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      // Backend cria Agency + usuário principal (agency_admin) na mesma
      // transação — role nunca é escolhido pelo formulário, é sempre
      // agency_admin pra quem funda a agência (Tarefa 9/11).
      await apiClient.createUser({
        organization_name: createForm.organizationName.trim(),
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        account_type: "agencias",
        role: "agency_admin",
        ...(createForm.phone ? { phone: createForm.phone } : {}),
      })
      toast({ title: "Agência criada", description: `"${createForm.organizationName.trim()}" cadastrada com sucesso.` })
      setIsAddDialogOpen(false)
      setCreateForm({ organizationName: "", name: "", email: "", password: "", phone: "", partner_level: "bronze" })
      await refetch()
    } catch (err: any) {
      toast({
        title: "Erro ao criar agência",
        description: err.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (agency: ApiAgency) => {
    setSelectedAgency(agency)
    setEditForm({
      name: agency.name,
      email: agency.email || "",
      phone: agency.phone || "",
      status: agency.status,
      partner_level: agency.partner_level,
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAgency) return
    setIsSubmitting(true)
    try {
      await updateAgency(selectedAgency.id, {
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        status: editForm.status,
        partner_level: editForm.partner_level,
      })
      toast({ title: "Agência atualizada", description: "Dados salvos com sucesso." })
      setIsEditDialogOpen(false)
      setSelectedAgency(null)
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Carregando agências…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar agências
          </h2>
          <p className="text-sm text-slate-500 max-w-sm">{error}</p>
        </div>
        <Button onClick={() => refetch()} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-transparent dark:via-transparent dark:to-transparent p-6 bg-slate-200 dark:bg-transparent px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 dark:bg-transparent px-0 py-0 space-y-6">

        <PageHeader
          title="Gestão de Agências"
          description="Gerencie todas as agências parceiras da plataforma"
          actions={<>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Nova Agência
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar nova agência</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Agências</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Agências Ativas</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stats.active}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% do total
                  </p>
                </div>
                <div className="bg-green-50 text-green-600 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar agências por nome, e-mail ou telefone…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativas</SelectItem>
                  <SelectItem value="inativo">Inativas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Agency List */}
        {filteredAgencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Building2 className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 text-sm">
              {searchQuery || selectedStatus !== "all"
                ? "Nenhuma agência encontrada com os filtros aplicados."
                : "Nenhuma agência cadastrada ainda."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAgencies.map((agency) => (
              <Card key={agency.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-16 w-16 border-2 border-slate-200">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-lg font-bold">
                          {agencyInitials(agency.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {agency.name}
                          </h3>
                          <Badge className={STATUS_BADGE_CLASSES[agency.status] || STATUS_BADGE_CLASSES.pendente}>
                            {STATUS_LABELS[agency.status] || agency.status}
                          </Badge>
                          <Badge className={LEVEL_BADGE_CLASSES[agency.partner_level] || LEVEL_BADGE_CLASSES.bronze}>
                            <Star className="h-3 w-3 mr-1" />
                            {PARTNER_LEVEL_LABELS[agency.partner_level] || agency.partner_level}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {agency.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{agency.email}</span>
                            </div>
                          )}
                          {agency.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Phone className="h-4 w-4 flex-shrink-0" />
                              {agency.phone}
                            </div>
                          )}
                          {agency.user && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                Admin: {agency.user.name || agency.user.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(agency)}
                        title="Editar agência"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog — Nova Agência */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Agência</DialogTitle>
            <DialogDescription>
              Cria a agência e o usuário principal (administrador) juntos, na mesma operação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-org-name">
                Nome da Agência <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-org-name"
                placeholder="Ex: Digital Innovations"
                value={createForm.organizationName}
                onChange={(e) => setCreateForm((f) => ({ ...f, organizationName: e.target.value }))}
              />
            </div>

            <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-1">
                Usuário principal
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Será o administrador desta agência — pode criar e gerenciar os demais usuários da equipe depois.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Nome do responsável <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Nome completo"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">
                E-mail do responsável <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="contato@agencia.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">
                Senha de acesso <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Telefone (opcional)</Label>
              <Input
                id="create-phone"
                placeholder="+55 11 98765-4321"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button className="btn-brand" onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Agência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar Agência */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Agência</DialogTitle>
            <DialogDescription>
              Atualiza os dados da agência selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativa</SelectItem>
                    <SelectItem value="inativo">Inativa</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-level">Nível</Label>
                <Select value={editForm.partner_level} onValueChange={(v) => setEditForm((f) => ({ ...f, partner_level: v }))}>
                  <SelectTrigger id="edit-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button className="btn-brand" onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
