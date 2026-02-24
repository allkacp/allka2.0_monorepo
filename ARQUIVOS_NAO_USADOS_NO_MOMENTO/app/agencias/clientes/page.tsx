
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import {
  Building2,
  Search,
  Eye,
  Edit,
  TrendingUp,
  Briefcase,
  DollarSign,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"

const mockProjects = [
  { id: 1, client_id: 1, name: "Website Redesign", status: "in_progress", value: 15000, start_date: "2024-01-20" },
  { id: 2, client_id: 1, name: "E-commerce Platform", status: "in_progress", value: 25000, start_date: "2024-02-01" },
  { id: 3, client_id: 1, name: "Mobile App", status: "completed", value: 30000, start_date: "2023-12-01" },
  { id: 4, client_id: 2, name: "Marketing Campaign", status: "in_progress", value: 8000, start_date: "2024-02-15" },
  { id: 5, client_id: 2, name: "Brand Identity", status: "completed", value: 12000, start_date: "2024-01-10" },
  { id: 6, client_id: 3, name: "SEO Optimization", status: "paused", value: 5000, start_date: "2023-12-15" },
]

const mockClients = [
  {
    id: 1,
    name: "TechCorp Solutions",
    cnpj: "12.345.678/0001-90",
    email: "contato@techcorp.com",
    phone: "(11) 98765-4321",
    status: "active",
    mrr: 5000,
    projects_count: 3,
    created_at: "2024-01-15",
    address: "Av. Paulista, 1000 - São Paulo, SP",
    contact_person: "João Silva",
  },
  {
    id: 2,
    name: "Inovação Digital Ltda",
    cnpj: "98.765.432/0001-10",
    email: "contato@inovacao.com",
    phone: "(11) 91234-5678",
    status: "active",
    mrr: 3500,
    projects_count: 2,
    created_at: "2024-02-20",
    address: "Rua Augusta, 500 - São Paulo, SP",
    contact_person: "Maria Santos",
  },
  {
    id: 3,
    name: "StartUp XYZ",
    cnpj: "11.222.333/0001-44",
    email: "hello@startupxyz.com",
    phone: "(11) 99999-8888",
    status: "inactive",
    mrr: 0,
    projects_count: 1,
    created_at: "2023-12-10",
    address: "Rua Oscar Freire, 200 - São Paulo, SP",
    contact_person: "Pedro Costa",
  },
]

export default function AgenciasClientesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedClient, setSelectedClient] = useState<(typeof mockClients)[0] | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState<(typeof mockClients)[0] | null>(null)

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalMRR = mockClients.reduce((sum, client) => sum + client.mrr, 0)
  const activeClients = mockClients.filter((c) => c.status === "active").length
  const avgTicket = totalMRR / activeClients

  const handleViewDetails = (client: (typeof mockClients)[0]) => {
    setSelectedClient(client)
    setIsEditMode(false)
  }

  const handleEditClient = (client: (typeof mockClients)[0]) => {
    setEditFormData(client)
    setSelectedClient(client)
    setIsEditMode(true)
  }

  const handleSaveEdit = () => {
    console.log("[v0] Saving client:", editFormData)
    setIsEditMode(false)
    setSelectedClient(editFormData)
  }

  const clientProjects = selectedClient ? mockProjects.filter((p) => p.client_id === selectedClient.id) : []

  const getProjectStatusBadge = (status: string) => {
    const statusConfig = {
      in_progress: { color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock, text: "Em Andamento" },
      completed: { color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2, text: "Concluído" },
      paused: { color: "bg-amber-100 text-amber-700 border-amber-300", icon: AlertCircle, text: "Pausado" },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.in_progress
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 py-0 px-0">
        <PageHeader title="Clientes da Agência" description="Gerencie seus clientes e acompanhe o desempenho" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                MRR Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">R$ {totalMRR.toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clientes Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeClients}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">R$ {avgTicket.toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{client.name}</CardTitle>
                      <CardDescription className="mt-1">CNPJ: {client.cnpj}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={client.status === "active" ? "default" : "secondary"}
                    className={
                      client.status === "active"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-slate-400 hover:bg-slate-500"
                    }
                  >
                    {client.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-slate-600 dark:text-slate-400">MRR:</span>
                    <span className="font-semibold">R$ {client.mrr.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-600 dark:text-slate-400">Projetos:</span>
                    <span className="font-semibold">{client.projects_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Cliente desde:</span>
                    <span className="font-semibold">{new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleViewDetails(client)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleEditClient(client)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Nenhum cliente encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={selectedClient !== null}
        onOpenChange={() => {
          setSelectedClient(null)
          setIsEditMode(false)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {selectedClient?.name.charAt(0)}
              </div>
              {isEditMode ? "Editar Cliente" : selectedClient?.name}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Atualize as informações do cliente" : "Informações detalhadas e projetos vinculados"}
            </DialogDescription>
          </DialogHeader>

          {isEditMode && editFormData ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={editFormData.cnpj}
                    onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Pessoa de Contato</Label>
                  <Input
                    id="edit-contact"
                    value={editFormData.contact_person}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-address">Endereço</Label>
                  <Input
                    id="edit-address"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedClient?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedClient?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">CNPJ</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedClient?.cnpj}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cliente desde</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedClient && new Date(selectedClient.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Building2 className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Endereço</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedClient?.address}</p>
                  </div>
                </div>
              </div>

              {/* Projects Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  Projetos Vinculados ({clientProjects.length})
                </h3>
                {clientProjects.length > 0 ? (
                  <div className="space-y-3">
                    {clientProjects.map((project) => {
                      const statusConfig = getProjectStatusBadge(project.status)
                      const StatusIcon = statusConfig.icon
                      return (
                        <div
                          key={project.id}
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{project.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  R$ {project.value.toLocaleString("pt-BR")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(project.start_date).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>
                            <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.text}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver Projeto Completo
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum projeto vinculado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                  Salvar Alterações
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelectedClient(null)}>
                  Fechar
                </Button>
                <Button onClick={() => setIsEditMode(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editar Cliente
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
