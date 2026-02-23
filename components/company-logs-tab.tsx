
import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Search, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { PaginationControls } from "@/components/pagination-controls"

interface LogEntry {
  id: string
  timestamp: string
  type: "Usuários" | "Projetos" | "Tarefas" | "Financeiro" | "Plano" | "Termos" | "Segurança" | "Sistema"
  action: string
  user: string
  role: "Admin" | "Usuário da empresa" | "Sistema"
  origin: "Web" | "Sistema" | "API"
  status: "Sucesso" | "Erro" | "Alerta"
  description: string
  ip?: string
  dataAnterior?: Record<string, any>
  dadosNovos?: Record<string, any>
  ids?: {
    usuarioId?: string
    projetoId?: string
    tarefaId?: string
    empresaId?: string
  }
}

interface CompanyLogsTabProps {
  company: any
}

// Mock data de logs
const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2025-02-05 14:32:18",
    type: "Usuários",
    action: "Usuário criado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Novo usuário João da Silva criado com permissões de Editor",
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-001", empresaId: "EMP-001" },
  },
  {
    id: "2",
    timestamp: "2025-02-05 13:45:22",
    type: "Projetos",
    action: "Projeto criado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Projeto 'Redesign Website Startup ABC' criado com orçamento de R$ 25.000",
    ip: "192.168.1.102",
    ids: { projetoId: "PRJ-002", empresaId: "EMP-001" },
  },
  {
    id: "3",
    timestamp: "2025-02-05 12:15:45",
    type: "Tarefas",
    action: "Tarefa aprovada",
    user: "Maria Santos",
    role: "Usuário da empresa",
    origin: "Web",
    status: "Sucesso",
    description: "Tarefa #5001 'Design UI/UX' foi aprovada",
    ip: "192.168.1.105",
    ids: { tarefaId: "TRF-5001", projetoId: "PRJ-001", empresaId: "EMP-001" },
  },
  {
    id: "4",
    timestamp: "2025-02-05 11:20:30",
    type: "Financeiro",
    action: "Pagamento confirmado",
    user: "Sistema",
    role: "Sistema",
    origin: "API",
    status: "Sucesso",
    description: "Pagamento de R$ 9.750 confirmado para Projeto 'Hospedagem Florescer Idosos'",
    ids: { projetoId: "PRJ-001", empresaId: "EMP-001" },
  },
  {
    id: "5",
    timestamp: "2025-02-05 10:05:12",
    type: "Termos",
    action: "Termo assinado",
    user: "Carlos Lima",
    role: "Usuário da empresa",
    origin: "Web",
    status: "Sucesso",
    description: "Termos de Uso v2.1 assinados pela empresa",
    ip: "192.168.1.108",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "6",
    timestamp: "2025-02-04 16:30:45",
    type: "Usuários",
    action: "Permissões alteradas",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Permissões do usuário Ana Santos alteradas: Leitor → Editor",
    dataAnterior: { permissao: "Leitor" },
    dadosNovos: { permissao: "Editor" },
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-003", empresaId: "EMP-001" },
  },
  {
    id: "7",
    timestamp: "2025-02-04 14:12:00",
    type: "Segurança",
    action: "Tentativa de acesso",
    user: "Sistema",
    role: "Sistema",
    origin: "Sistema",
    status: "Alerta",
    description: "Tentativa de acesso com credenciais inválidas detectada",
    ip: "203.0.113.45",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "8",
    timestamp: "2025-02-04 11:45:30",
    type: "Projetos",
    action: "Projeto editado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Status do Projeto 'Identidade Visual FoodCorp' alterado para Concluído",
    dataAnterior: { status: "Em Andamento" },
    dadosNovos: { status: "Concluído" },
    ip: "192.168.1.102",
    ids: { projetoId: "PRJ-003", empresaId: "EMP-001" },
  },
  {
    id: "9",
    timestamp: "2025-02-03 15:22:18",
    type: "Tarefas",
    action: "Tarefa atrasada",
    user: "Sistema",
    role: "Sistema",
    origin: "Sistema",
    status: "Alerta",
    description: "Tarefa #5010 'Brand Guidelines' foi marcada como atrasada",
    ids: { tarefaId: "TRF-5010", projetoId: "PRJ-003", empresaId: "EMP-001" },
  },
  {
    id: "10",
    timestamp: "2025-02-03 10:00:00",
    type: "Plano",
    action: "Alteração de plano de crédito",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Plano de crédito alterado de Basic para Premium (500 créditos)",
    dataAnterior: { plano: "Basic", creditos: 100 },
    dadosNovos: { plano: "Premium", creditos: 500 },
    ip: "192.168.1.102",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "11",
    timestamp: "2025-02-02 09:30:45",
    type: "Usuários",
    action: "Usuário bloqueado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Usuário Pedro Costa foi bloqueado por inatividade prolongada",
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-005", empresaId: "EMP-001" },
  },
  {
    id: "12",
    timestamp: "2025-02-02 08:15:22",
    type: "Financeiro",
    action: "Pagamento recusado",
    user: "Sistema",
    role: "Sistema",
    origin: "API",
    status: "Erro",
    description: "Pagamento de R$ 5.000 recusado - Cartão expirado",
    ids: { projetoId: "PRJ-004", empresaId: "EMP-001" },
  },
]

export function CompanyLogsTab({ company }: CompanyLogsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === "all" || log.type === filterType
      const matchesRole = filterRole === "all" || log.role === filterRole
      const matchesStatus = filterStatus === "all" || log.status === filterStatus
      
      const logDate = log.timestamp.split(" ")[0]
      const matchesDateStart = !dateStart || logDate >= dateStart
      const matchesDateEnd = !dateEnd || logDate <= dateEnd

      return matchesSearch && matchesType && matchesRole && matchesStatus && matchesDateStart && matchesDateEnd
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [searchTerm, filterType, filterRole, filterStatus, dateStart, dateEnd])

  const totalLogs = filteredLogs.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  const totalPages = Math.ceil(totalLogs / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const getTypeColor = (type: string): { bg: string; text: string; border: string } => {
    const colors: Record<string, any> = {
      "Usuários": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      "Projetos": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
      "Tarefas": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      "Financeiro": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      "Plano": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
      "Termos": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
      "Segurança": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
      "Sistema": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
    }
    return colors[type] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" }
  }

  const getStatusColor = (status: string): { bg: string; text: string } => {
    const colors: Record<string, any> = {
      "Sucesso": { bg: "bg-emerald-100", text: "text-emerald-700" },
      "Erro": { bg: "bg-red-100", text: "text-red-700" },
      "Alerta": { bg: "bg-amber-100", text: "text-amber-700" },
    }
    return colors[status] || { bg: "bg-gray-100", text: "text-gray-700" }
  }

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      "Admin": "bg-purple-100 text-purple-700",
      "Usuário da empresa": "bg-blue-100 text-blue-700",
      "Sistema": "bg-gray-100 text-gray-700",
    }
    return colors[role] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-4 px-[50px] pt-[25px]">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ação, usuário ou descrição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Tipo de Evento */}
          <Select value={filterType} onValueChange={(value) => {
            setFilterType(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos os Tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Usuários">Usuários</SelectItem>
              <SelectItem value="Projetos">Projetos</SelectItem>
              <SelectItem value="Tarefas">Tarefas</SelectItem>
              <SelectItem value="Financeiro">Financeiro</SelectItem>
              <SelectItem value="Plano">Plano</SelectItem>
              <SelectItem value="Termos">Termos</SelectItem>
              <SelectItem value="Segurança">Segurança</SelectItem>
              <SelectItem value="Sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>

          {/* Papel/Origem */}
          <Select value={filterRole} onValueChange={(value) => {
            setFilterRole(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos os Papéis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Papéis</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Usuário da empresa">Usuário da empresa</SelectItem>
              <SelectItem value="Sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={filterStatus} onValueChange={(value) => {
            setFilterStatus(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Sucesso">Sucesso</SelectItem>
              <SelectItem value="Erro">Erro</SelectItem>
              <SelectItem value="Alerta">Alerta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => {
                setDateStart(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Data inicial"
              className="pl-9 h-8 text-xs"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => {
                setDateEnd(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Data final"
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Paginação no Topo */}
      {totalLogs > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-gray-600">
            Exibindo <span className="font-semibold">{startIndex + 1}</span> a{" "}
            <span className="font-semibold">{Math.min(endIndex, totalLogs)}</span> de{" "}
            <span className="font-semibold">{totalLogs}</span> logs
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Itens por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Lista de Logs */}
      {paginatedLogs.length > 0 ? (
        <div className="space-y-2">
          {paginatedLogs.map((log) => {
            const typeColor = getTypeColor(log.type)
            const statusColor = getStatusColor(log.status)
            const roleColor = getRoleColor(log.role)
            const isExpanded = expandedLog === log.id

            return (
              <Card
                key={log.id}
                className="p-3 hover:shadow-md transition-all border-l-4"
                style={{ borderLeftColor: typeColor.text.split("-")[1] === "blue" ? "#3b82f6" : typeColor.text.split("-")[1] === "purple" ? "#a855f7" : typeColor.text.split("-")[1] === "green" ? "#10b981" : typeColor.text.split("-")[1] === "amber" ? "#f59e0b" : typeColor.text.split("-")[1] === "indigo" ? "#6366f1" : typeColor.text.split("-")[1] === "cyan" ? "#06b6d4" : typeColor.text.split("-")[1] === "red" ? "#ef4444" : "#6b7280" }}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-600">{log.timestamp}</span>
                        <Badge className={`text-[10px] ${typeColor.bg} ${typeColor.text} border-0`}>
                          {log.type}
                        </Badge>
                        <Badge className={`text-[10px] ${statusColor.bg} ${statusColor.text} border-0`}>
                          {log.status}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900">{log.action}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{log.description}</p>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Badge variant="outline" className={`text-[9px] px-2 py-0.5 ${roleColor}`}>
                          {log.user}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-700">
                          {log.origin}
                        </Badge>
                        {log.ip && (
                          <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-600">
                            {log.ip}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      title={isExpanded ? "Fechar" : "Expandir"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Detalhes Expandidos */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {log.dataAnterior && log.dadosNovos && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Dados Anteriores:</p>
                            <pre className="bg-gray-50 p-2 rounded text-[9px] overflow-x-auto">
                              {JSON.stringify(log.dataAnterior, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Dados Novos:</p>
                            <pre className="bg-gray-50 p-2 rounded text-[9px] overflow-x-auto">
                              {JSON.stringify(log.dadosNovos, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {log.ids && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-1 text-xs">IDs Relacionados:</p>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(log.ids).map(([key, value]) => (
                              value && (
                                <Badge key={key} variant="outline" className="text-[9px] px-2 py-0.5">
                                  {key}: {value}
                                </Badge>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum log encontrado com os filtros aplicados.</p>
        </Card>
      )}

      {/* Paginação no Rodapé */}
      {totalLogs > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  )
}
