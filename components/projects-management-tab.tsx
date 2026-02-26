// @ts-nocheck
import { useState, useMemo } from "react"
import { ProjectManagementModal } from "@/components/project-management-modal"
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel"
import { Eye, Copy, Search, Briefcase, X, Pencil, FolderKanban, Plus } from "lucide-react"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"

interface Project {
  id: number
  name: string
  client: string
  clientCNPJ: string
  agency: string
  consultant: string
  consultantEmail: string
  type: string
  status: string
  progress: number
  budget: number
  spent: number
  createdDate: string
  startDate: string
  deadline: string
  team: number
  nomades: string[]
  bitrixSync: boolean
  portfolioPermission: boolean
  overdue: boolean
  value: number
  fromLead: boolean
  companyId?: number
}

interface ProjectsManagementTabProps {
  company: {
    id: string
    name: string
  }
}

// Mock de projetos - em produção viriam da API
const mockAllProjects: Project[] = [
  {
    id: 1,
    name: "Hospedagem Florescer Idosos",
    client: "Florescer",
    clientCNPJ: "12.345.678/0001-90",
    agency: "Lamego Academy",
    consultant: "Equipe Lamego",
    consultantEmail: "contato@lamego.com.vc",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 65,
    budget: 15000,
    spent: 9750,
    createdDate: "19/02/2025",
    startDate: "2024-01-15",
    deadline: "2024-03-30",
    team: 5,
    nomades: ["Ana Santos", "Carlos Lima"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: false,
    value: 15000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 2,
    name: "Redesign Website Startup ABC",
    client: "Startup ABC",
    clientCNPJ: "98.765.432/0001-10",
    agency: "Design Studio",
    consultant: "Maria Designer",
    consultantEmail: "maria@designstudio.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 45,
    budget: 25000,
    spent: 11250,
    createdDate: "15/01/2025",
    startDate: "2024-02-01",
    deadline: "2024-05-15",
    team: 3,
    nomades: ["Maria Silva", "João Dev"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 25000,
    fromLead: false,
    companyId: 1,
  },
  {
    id: 3,
    name: "Identidade Visual FoodCorp",
    client: "FoodCorp",
    clientCNPJ: "11.222.333/0001-44",
    agency: "Creative Partners",
    consultant: "Pedro Criativo",
    consultantEmail: "pedro@creative.com",
    type: "Design",
    status: "completed",
    progress: 100,
    budget: 8000,
    spent: 7800,
    createdDate: "10/12/2024",
    startDate: "2023-12-10",
    deadline: "2024-01-20",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: true,
    portfolioPermission: false,
    overdue: false,
    value: 8000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 4,
    name: "Campanha Lançamento Produto XYZ",
    client: "Tech Innovations",
    clientCNPJ: "22.333.444/0001-55",
    agency: "Marketing Pro",
    consultant: "Lucas Marketing",
    consultantEmail: "lucas@marketingpro.com",
    type: "Marketing Digital",
    status: "negotiation",
    progress: 20,
    budget: 32000,
    spent: 6400,
    createdDate: "05/02/2025",
    startDate: "2024-03-01",
    deadline: "2024-06-30",
    team: 4,
    nomades: ["Carlos Lima", "Ana Santos"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 32000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 5,
    name: "Desenvolvimento App Mobile E-commerce",
    client: "E-Shop Brasil",
    clientCNPJ: "55.666.777/0001-88",
    agency: "Tech Solutions",
    consultant: "Rafael Dev",
    consultantEmail: "rafael@techsolutions.com",
    type: "Desenvolvimento Mobile",
    status: "planning",
    progress: 10,
    budget: 45000,
    spent: 4500,
    createdDate: "25/01/2025",
    startDate: "2024-03-15",
    deadline: "2024-10-30",
    team: 6,
    nomades: ["João Dev", "Maria Silva", "Carlos Dev"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 45000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 6,
    name: "Consultoria Estratégica Digital Cancelada",
    client: "Old Corp",
    clientCNPJ: "33.444.555/0001-66",
    agency: "Consulting Plus",
    consultant: "Joana Consultora",
    consultantEmail: "joana@consulting.com",
    type: "Consultoria",
    status: "canceled",
    progress: 30,
    budget: 18000,
    spent: 5400,
    createdDate: "01/12/2024",
    startDate: "2024-01-10",
    deadline: "2024-04-10",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: true,
    value: 18000,
    fromLead: false,
    companyId: 1,
  },
]

export function ProjectsManagementTab({ company }: ProjectsManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"view" | "edit">("view")

  // Create / Clone panel
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [clonePanelOpen, setClonePanelOpen] = useState(false)
  const [cloneInitialData, setCloneInitialData] = useState<any>(null)
  const [quickStatusFilter, setQuickStatusFilter] = useState<string | null>(null)

  const companyProjects = useMemo(() => {
    return mockAllProjects.filter(
      (p) => p.client.toLowerCase() === company.name.toLowerCase() || p.companyId === parseInt(company.id)
    )
  }, [company.id, company.name])

  const filteredProjects = useMemo(() => {
    return companyProjects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.client.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesQuick = !quickStatusFilter || p.status === quickStatusFilter
      return matchesSearch && matchesQuick
    })
  }, [companyProjects, searchTerm, quickStatusFilter])

  const totalProjects = filteredProjects.length
  const totalPages = Math.ceil(totalProjects / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage)

  const handleItemsPerPageChange = (value: number) => { setItemsPerPage(value); setCurrentPage(1) }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const half = Math.floor(maxVisible / 2)
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= half + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
      if (totalPages > maxVisible) pages.push("...")
    } else if (currentPage >= totalPages - half) {
      pages.push("...")
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push("...")
      for (let i = currentPage - half; i <= currentPage + half; i++) pages.push(i)
      pages.push("...")
    }
    return pages
  }

  const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
    "draft":            { label: "Rascunho",         color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
    "awaiting-payment": { label: "Ag. Pagamento",    color: "bg-cyan-100 text-cyan-800",     dot: "bg-cyan-500" },
    "planning":         { label: "Planejamento",     color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
    "in-progress":      { label: "Em Andamento",     color: "bg-blue-100 text-blue-800",     dot: "bg-blue-500" },
    "paused":           { label: "Pausado",          color: "bg-amber-100 text-amber-800",   dot: "bg-amber-400" },
    "completed":        { label: "Concluído",        color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    "canceled":         { label: "Cancelado",        color: "bg-red-100 text-red-800",       dot: "bg-red-500" },
    "negotiation":      { label: "Negociação",      color: "bg-slate-100 text-slate-700",   dot: "bg-slate-400" },
  }

  const handleViewProject = (project: Project) => { setSelectedProject(project); setModalMode("view"); setModalOpen(true) }
  const handleEditProject = (project: Project) => { setSelectedProject(project); setModalMode("edit"); setModalOpen(true) }
  const handleCloneProject = (project: Project) => {
    setCloneInitialData({
      nome: project.name + " (cópia)",
      tipo: project.type,
      agencia: project.agency,
      cliente: project.client,
      clienteCnpj: project.clientCNPJ || "",
      consultor: project.consultant,
      emailConsultor: project.consultantEmail,
      dataInicio: project.startDate,
      prazo: project.deadline,
      orcamento: project.budget ? String(project.budget) : "",
      permitePortfolio: project.portfolioPermission,
      sincronizadoBitrix: project.bitrixSync,
      descricao: "",
      status: project.status as any,
    })
    setClonePanelOpen(true)
  }
  const handleSaveProjectChanges = (updatedProject: Project) => { setSelectedProject(updatedProject); setModalMode("view") }

  return (
    <>
    <div className="space-y-4">

      {/*  Status filter bar  */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setQuickStatusFilter(null)}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
            quickStatusFilter === null
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
          }`}
        >
          <Briefcase className="h-3 w-3" />
          <span>Total</span>
          <span className="font-bold">{companyProjects.length}</span>
        </button>
        <div className="h-5 w-px bg-slate-200" />
        {Object.entries(STATUS_MAP).filter(([k]) => k !== "negotiation").map(([statusKey, { label, dot }]) => {
          const count = companyProjects.filter(p => p.status === statusKey).length
          const isActive = quickStatusFilter === statusKey
          if (count === 0 && !isActive) return null
          return (
            <button
              key={statusKey}
              onClick={() => setQuickStatusFilter(isActive ? null : statusKey)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
              <span>{label}</span>
              <span className={`font-bold ${isActive ? "text-white" : "text-slate-800"}`}>{count}</span>
            </button>
          )
        })}
        <div className="ml-auto">
          <button
            onClick={() => setCreatePanelOpen(true)}
            className="btn-brand flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Search + column config */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou cliente..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <ItemsPerPageSelect value={itemsPerPage} onChange={handleItemsPerPageChange} />
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projeto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Prazo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FolderKanban className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">Nenhum projeto encontrado</p>
                  </div>
                </td>
              </tr>
            ) : paginatedProjects.map((project) => {
              const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" }
              return (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <button
                      className="text-left font-medium text-slate-800 hover:text-blue-600 transition-colors text-sm leading-tight"
                      onClick={() => handleViewProject(project)}
                    >
                      {project.name}
                    </button>
                    <div className="text-xs text-slate-400 mt-0.5">{project.agency}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-600">{project.client}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">{project.type}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">{project.deadline}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleViewProject(project)} title="Visualizar" className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleEditProject(project)} title="Editar" className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleCloneProject(project)} title="Clonar" className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Mostrando {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalProjects)} de {totalProjects} projetos
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
              ‹
            </button>
            {getPageNumbers().map((page, i) =>
              page === "..." ? (
                <span key={`dots-${i}`} className="h-8 w-8 flex items-center justify-center text-slate-400 text-xs">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-colors ${currentPage === page ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {page}
                </button>
              )
            )}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
              ›
            </button>
          </div>
        </div>
      )}

    </div>

    {/* Project view/edit modal */}
    {selectedProject && (
      <ProjectManagementModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        project={selectedProject}
        mode={modalMode}
        onSave={handleSaveProjectChanges}
      />
    )}

    {/* Create panel */}
    <ProjectCreateNewPanel
      open={createPanelOpen}
      onOpenChange={setCreatePanelOpen}
    />

    {/* Clone panel */}
    {cloneInitialData && (
      <ProjectCreateNewPanel
        open={clonePanelOpen}
        onOpenChange={setClonePanelOpen}
        initialData={cloneInitialData}
      />
    )}
    </>
  )
}
