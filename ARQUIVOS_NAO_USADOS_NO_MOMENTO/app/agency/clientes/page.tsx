
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Search, Eye, Edit, TrendingUp, Briefcase, DollarSign } from "lucide-react"

// Mock data
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
  },
]

export default function AgencyClientesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  console.log("[v0] AgencyClientesPage rendered")

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10">
      <div className="container mx-auto pt-6 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Clientes da Agência
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Gerencie seus clientes e acompanhe o desempenho</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
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
    </div>
  )
}
