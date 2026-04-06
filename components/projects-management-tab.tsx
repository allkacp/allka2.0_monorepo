// @ts-nocheck
import { useState, useMemo } from "react"
import { ProjectManagementModal } from "@/components/project-management-modal"
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel"
import { Eye, Copy, Search, Briefcase, X, Pencil, FolderKanban, Plus, AlertTriangle, CheckCircle, Trash2 } from "lucide-react"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { mockProjects as allPlatformProjects, addMockProject } from "@/lib/mock-projects"

interface ProjectsManagementTabProps {
  company: {
    id: string | number
    name: string
  }
}

export function ProjectsManagementTab({ company }: ProjectsManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"view" | "edit">("view")

  // Clone dialog state
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [projectToClone, setProjectToClone] = useState<Project | null>(null)
  const [cloneProjectName, setCloneProjectName] = useState("")
  const [cloneOptions, setCloneOptions] = useState({ team: true, products: true, vault: true, financial: false })

  // Create / Clone panel
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [clonePanelOpen, setClonePanelOpen] = useState(false)
  const [cloneInitialData, setCloneInitialData] = useState<any>(null)
  const [quickStatusFilter, setQuickStatusFilter] = useState<string | null>(null)

  const [companyProjects, setCompanyProjects] = useState(() =>
    allPlatformProjects.filter((p) => p.companyId === parseInt(company.id))
  )

  const handleProjectCreated = (project: any) => {
    const withCompany = { ...project, companyId: parseInt(company.id) }
    addMockProject(withCompany)
    setCompanyProjects(prev => [...prev, withCompany])
  }

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
    setProjectToClone(project)
    setCloneProjectName(`(copy) ${project.name}`)
    setCloneOptions({ team: true, products: true, vault: true, financial: false })
    setShowCloneDialog(true)
  }

  const handleConfirmCloneAndOpen = () => {
    if (!projectToClone || !cloneProjectName.trim()) return

    const cloneData: any = {
      nome: cloneProjectName,
      cliente: projectToClone.client,
      clienteCnpj: projectToClone.clientCNPJ ?? "",
      agencia: projectToClone.agency,
      tipo: projectToClone.type,
      dataInicio: projectToClone.startDate ?? "",
      prazo: projectToClone.deadline ?? "",
      descricao: "",
      status: "draft",
      permitePortfolio: projectToClone.portfolioPermission ?? false,
      sincronizadoBitrix: projectToClone.bitrixSync ?? false,
    }

    if (cloneOptions.team) {
      cloneData.consultor = projectToClone.consultant ?? ""
      cloneData.emailConsultor = projectToClone.consultantEmail ?? ""
    }

    if (cloneOptions.financial) {
      cloneData.orcamento = String(projectToClone.budget ?? "")
    }

    setShowCloneDialog(false)
    setProjectToClone(null)
    setCloneProjectName("")
    setCloneInitialData(cloneData)
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
                    <TooltipProvider delayDuration={300}>
                      <div className="flex items-center justify-end gap-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewProject(project)} className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                              <Eye className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Visualizar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleCloneProject(project)} className="h-5 w-5 p-0 rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50">
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Duplicar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Cancelar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
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
        onEdit={() => setModalMode("edit")}
        onClone={() => handleCloneProject(selectedProject)}
        onExport={() => {}}
        onCancel={() => { setModalOpen(false) }}
        onSave={handleSaveProjectChanges}
      />
    )}

    {/* Create panel */}
    <ProjectCreateNewPanel
      open={createPanelOpen}
      onOpenChange={setCreatePanelOpen}
      companyId={parseInt(company.id)}
      companyName={company.name}
      onCreate={handleProjectCreated}
    />

    {/* Clone panel */}
    {cloneInitialData && (
      <ProjectCreateNewPanel
        open={clonePanelOpen}
        onOpenChange={(v) => { setClonePanelOpen(v); if (!v) setCloneInitialData(null) }}
        initialData={cloneInitialData}
        cloneMode
        companyId={parseInt(company.id)}
        companyName={company.name}
        onCreate={handleProjectCreated}
      />
    )}

    {/* Clone dialog */}
    <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="app-brand-header px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Copy className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Duplicar Projeto</h2>
              <p className="text-xs text-white/60 mt-0.5">Selecione o que deseja incluir na cópia</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="clone-name-tab" className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Nome do Novo Projeto
            </Label>
            <Input
              id="clone-name-tab"
              value={cloneProjectName}
              onChange={(e) => setCloneProjectName(e.target.value)}
              placeholder="Nome do projeto duplicado"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">O que clonar</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 opacity-70">
                <div className="mt-0.5 h-4 w-4 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Dados do Projeto</p>
                  <p className="text-xs text-slate-400 mt-0.5">Cliente, agência, tipo, datas e descrição — sempre incluídos</p>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                <Checkbox
                  checked={cloneOptions.team}
                  onCheckedChange={(v) => setCloneOptions(o => ({ ...o, team: !!v }))}
                  className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Equipe / Usuários</p>
                  <p className="text-xs text-slate-400 mt-0.5">Consultor responsável, nômades e membros da equipe</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                <Checkbox
                  checked={cloneOptions.products}
                  onCheckedChange={(v) => setCloneOptions(o => ({ ...o, products: !!v }))}
                  className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Produtos</p>
                  <p className="text-xs text-slate-400 mt-0.5">Lista de produtos disponíveis (dados de contratação serão resetados)</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                <Checkbox
                  checked={cloneOptions.vault}
                  onCheckedChange={(v) => setCloneOptions(o => ({ ...o, vault: !!v }))}
                  className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Arquivos e Senhas (Cofre)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Credenciais e cartões de pagamento — pode remover antes de salvar</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                <Checkbox
                  checked={cloneOptions.financial}
                  onCheckedChange={(v) => setCloneOptions(o => ({ ...o, financial: !!v }))}
                  className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Orçamento</p>
                  <p className="text-xs text-slate-400 mt-0.5">Valor e orçamento do projeto (gastos serão zerados)</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              O projeto será aberto para revisão antes de ser salvo. Você poderá editar e remover qualquer informação na tela de criação.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowCloneDialog(false); setProjectToClone(null); setCloneProjectName("") }}
            className="h-8 px-4 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmCloneAndOpen}
            disabled={!cloneProjectName.trim()}
            className="h-8 px-4 text-xs btn-brand"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Abrir para Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
