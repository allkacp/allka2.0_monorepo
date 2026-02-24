
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Edit, Filter, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/page-header"

const tasks = [
  {
    id: "19711",
    code: "T19711",
    title: "Banner Digital Estático ou Carrossel",
    status: "aprovacao_pendente_agencia",
    statusLabel: "APROVAÇÃO PENDENTE - AGÊNCIA",
    qualificada: true,
    emergencial: true,
    deliveryDate: "07/10/2025 13:00",
    executionDate: "07/10/2025 13:00",
    completedDate: null,
    project: "Sebrae CE",
    projectLink: "/company/projetos/sebrae-ce",
  },
  {
    id: "19710",
    code: "T19710",
    title: "Banner Digital Estático ou Carrossel",
    status: "aprovacao_pendente_agencia",
    statusLabel: "APROVAÇÃO PENDENTE - AGÊNCIA",
    qualificada: true,
    emergencial: true,
    deliveryDate: "07/10/2025 13:00",
    executionDate: "07/10/2025 13:00",
    completedDate: null,
    project: "Sebrae CE",
    projectLink: "/company/projetos/sebrae-ce",
  },
  {
    id: "19709",
    code: "T19709",
    title: "Post para Redes Sociais (8 criativos + 8 legendas)",
    status: "em_andamento",
    statusLabel: "EM ANDAMENTO",
    qualificada: false,
    emergencial: false,
    deliveryDate: "08/10/2025 18:00",
    executionDate: "08/10/2025 18:00",
    completedDate: null,
    project: "Lojão do Clima",
    projectLink: "/company/projetos/lojao-clima",
  },
  {
    id: "19708",
    code: "T19708",
    title: "Copywriting - Landing Page",
    status: "concluida",
    statusLabel: "CONCLUÍDA",
    qualificada: true,
    emergencial: false,
    deliveryDate: "05/10/2025 23:59",
    executionDate: "05/10/2025 23:59",
    completedDate: "05/10/2025 18:30",
    project: "StartupXYZ",
    projectLink: "/company/projetos/startupxyz",
  },
  {
    id: "19707",
    code: "T19707",
    title: "Design de Posts - Instagram",
    status: "em_revisao",
    statusLabel: "EM REVISÃO",
    qualificada: true,
    emergencial: false,
    deliveryDate: "06/10/2025 15:00",
    executionDate: "06/10/2025 15:00",
    completedDate: null,
    project: "Fashion Store",
    projectLink: "/company/projetos/fashion-store",
  },
]

export default function NomadesTarefasPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string, statusLabel: string) => {
    switch (status) {
      case "aprovacao_pendente_agencia":
        return (
          <Badge className="bg-yellow-500 text-white font-semibold shadow-sm px-3 py-1 text-xs">{statusLabel}</Badge>
        )
      case "em_andamento":
        return (
          <Badge className="bg-blue-600 text-white font-semibold shadow-sm px-3 py-1 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {statusLabel}
          </Badge>
        )
      case "em_revisao":
        return (
          <Badge className="bg-orange-500 text-white font-semibold shadow-sm px-3 py-1 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            {statusLabel}
          </Badge>
        )
      case "concluida":
        return (
          <Badge className="bg-green-600 text-white font-semibold shadow-sm px-3 py-1 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            {statusLabel}
          </Badge>
        )
      case "rejeitada":
        return (
          <Badge className="bg-red-600 text-white font-semibold shadow-sm px-3 py-1 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            {statusLabel}
          </Badge>
        )
      default:
        return <Badge className="bg-gray-500 text-white font-semibold shadow-sm px-3 py-1 text-xs">{statusLabel}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Tarefas"
        description={`${filteredTasks.length} registros encontrados.`}
        actions={
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
        }
      />

      {/* Filters */}
      {showFilters && (
        <Card className="shadow-md border-0 bg-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, tarefa ou projeto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="aprovacao_pendente_agencia">Aprovação Pendente - Agência</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="em_revisao">Em Revisão</option>
                  <option value="concluida">Concluída</option>
                  <option value="rejeitada">Rejeitada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Header */}
      <Card className="shadow-md border-0 bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tarefa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Prazo de Entrega
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Prazo de Execução
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Concluída Em
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Projeto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                          onClick={() => navigate(`/nomades/minhastarefas/${task.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                          onClick={() => navigate(`/nomades/minhastarefas/${task.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{task.id}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{task.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(task.status, task.statusLabel)}
                        {task.qualificada && (
                          <Badge className="bg-green-600 text-white font-semibold shadow-sm px-3 py-1 text-xs w-fit">
                            QUALIFICADA
                          </Badge>
                        )}
                        {task.emergencial && (
                          <Badge className="bg-red-600 text-white font-semibold shadow-sm px-3 py-1 text-xs w-fit">
                            EMERGENCIAL
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{task.deliveryDate}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{task.executionDate}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{task.completedDate || "-"}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(task.projectLink)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        {task.project}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma tarefa encontrada com os filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
