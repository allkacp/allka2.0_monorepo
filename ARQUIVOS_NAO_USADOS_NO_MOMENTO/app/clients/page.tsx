
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  FolderOpen,
  Plus,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Calendar,
} from "lucide-react"

interface Client {
  id: number
  name: string
  logo?: string
  email: string
  phone: string
  address: string
  status: "active" | "inactive" | "pending"
  projects: {
    total: number
    active: number
  }
  mrr: number
  created_at: string
  last_project: string
}

const mockClients: Client[] = [
  {
    id: 1,
    name: "TechCorp Solutions",
    logo: "/placeholder.svg?height=40&width=40",
    email: "contato@techcorp.com",
    phone: "(11) 98765-4321",
    address: "São Paulo, SP",
    status: "active",
    projects: { total: 12, active: 3 },
    mrr: 8500,
    created_at: "2023-01-15",
    last_project: "2024-01-20",
  },
  {
    id: 2,
    name: "Inovação Digital",
    email: "contato@inovacao.com",
    phone: "(21) 97654-3210",
    address: "Rio de Janeiro, RJ",
    status: "active",
    projects: { total: 8, active: 2 },
    mrr: 5200,
    created_at: "2023-03-22",
    last_project: "2024-01-18",
  },
  {
    id: 3,
    name: "StartUp Ventures",
    email: "hello@startup.com",
    phone: "(11) 96543-2109",
    address: "São Paulo, SP",
    status: "pending",
    projects: { total: 2, active: 1 },
    mrr: 1500,
    created_at: "2024-01-05",
    last_project: "2024-01-15",
  },
  {
    id: 4,
    name: "Mega Retail Group",
    logo: "/placeholder.svg?height=40&width=40",
    email: "projetos@megaretail.com",
    phone: "(11) 95432-1098",
    address: "São Paulo, SP",
    status: "active",
    projects: { total: 18, active: 5 },
    mrr: 12000,
    created_at: "2022-11-10",
    last_project: "2024-01-22",
  },
  {
    id: 5,
    name: "Consultoria Estratégica",
    email: "contato@consultoria.com",
    phone: "(31) 94321-0987",
    address: "Belo Horizonte, MG",
    status: "inactive",
    projects: { total: 5, active: 0 },
    mrr: 0,
    created_at: "2023-06-18",
    last_project: "2023-11-30",
  },
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalMRR = clients.reduce((sum, client) => sum + client.mrr, 0)
  const activeClients = clients.filter((c) => c.status === "active").length
  const totalProjects = clients.reduce((sum, client) => sum + client.projects.total, 0)
  const activeProjects = clients.reduce((sum, client) => sum + client.projects.active, 0)

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "Ativo" },
      inactive: { color: "bg-slate-100 text-slate-700 border-slate-200", text: "Inativo" },
      pending: { color: "bg-amber-50 text-amber-700 border-amber-200", text: "Pendente" },
    }
    return variants[status as keyof typeof variants] || variants.pending
  }

  return (
    <div className="container mx-auto pt-6 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
            Clientes
          </h1>
          <p className="text-slate-600 mt-1">Gerencie seus clientes e acompanhe o relacionamento comercial</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total de Clientes</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{clients.length}</p>
                <p className="text-xs text-slate-500 mt-1">{activeClients} ativos</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">MRR Total</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">R$ {(totalMRR / 1000).toFixed(1)}k</p>
                <p className="text-xs text-emerald-600 mt-1">+12% vs. mês anterior</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Projetos Totais</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{totalProjects}</p>
                <p className="text-xs text-slate-500 mt-1">{activeProjects} em andamento</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Ticket Médio</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  R$ {activeClients > 0 ? Math.round(totalMRR / activeClients) : 0}
                </p>
                <p className="text-xs text-amber-600 mt-1">+8% vs. mês anterior</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 focus:outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="pending">Pendentes</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client) => {
          const statusBadge = getStatusBadge(client.status)
          return (
            <Card key={client.id} className="hover:shadow-lg transition-all duration-200 border-slate-200">
              <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={client.logo || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-slate-900">{client.name}</CardTitle>
                      <Badge className={`${statusBadge.color} border mt-1`}>{statusBadge.text}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="hover:bg-slate-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-blue-500" />
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span>{client.address}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <p className="text-xs text-purple-600 font-medium">Projetos</p>
                      <p className="text-lg font-bold text-purple-700">
                        {client.projects.active}/{client.projects.total}
                      </p>
                      <p className="text-xs text-purple-600">ativos/total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-medium">MRR</p>
                      <p className="text-lg font-bold text-emerald-700">R$ {client.mrr.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    <span>Cliente desde {new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-transparent"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 bg-transparent"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum cliente encontrado</h3>
              <p className="text-slate-600 mb-4">Não encontramos clientes com os filtros aplicados.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterStatus("all")
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
