// @ts-nocheck
import { useState, useEffect } from "react"
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/data-table"
import type { Project } from "@/lib/api"
import { ProjectModalForm } from "@/components/project-modal-form"
import { Plus, Eye, Edit, Trash2, Calendar, DollarSign, Users, TrendingUp, Download, Filter, CheckCircle } from 'lucide-react'
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"

export default function CompanyProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null as Project | null })
  const [exportingData, setExportingData] = useState(false)
  const [viewDialog, setViewDialog] = useState({ open: false, project: null as Project | null })

  const projectStats = [
    {
      title: "Total de Projetos",
      value: projects.length.toString(),
      icon: TrendingUp,
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
    },
    {
      title: "Em Andamento",
      value: projects.filter((p) => p.status === "in_progress").length.toString(),
      icon: Calendar,
      color: "bg-gradient-to-r from-yellow-500 to-orange-500",
    },
    {
      title: "Concluídos",
      value: projects.filter((p) => p.status === "completed").length.toString(),
      icon: CheckCircle,
      color: "bg-gradient-to-r from-green-500 to-emerald-500",
    },
    {
      title: "Investimento Total",
      value: `R$ ${(projects.reduce((sum, p) => sum + (p.budget || 0), 0) / 1000).toFixed(0)}k`,
      icon: DollarSign,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
    },
  ]

  const columns: DataTableColumn<Project>[] = [
    {
      key: "name",
      label: "Nome do Projeto",
      sortable: true,
    },
    {
      key: "client",
      label: "Cliente",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (project) => {
        const statusMap = {
          active: { label: "Ativo", className: "bg-green-100 text-green-800" },
          in_progress: { label: "Em Andamento", className: "bg-blue-100 text-blue-800" },
          completed: { label: "Concluído", className: "bg-gray-100 text-gray-800" },
          on_hold: { label: "Pausado", className: "bg-yellow-100 text-yellow-800" },
          awaiting_payment: { label: "Aguardando Pagamento", className: "bg-cyan-100 text-cyan-800" },
        }
        const status = statusMap[project.status as keyof typeof statusMap] || statusMap.active
        return <Badge className={status.className}>{status.label}</Badge>
      },
    },
    {
      key: "budget",
      label: "Orçamento",
      sortable: true,
      render: (project) => `R$ ${project.budget?.toLocaleString() || "0"}`,
    },
    {
      key: "deadline",
      label: "Prazo",
      sortable: true,
    },
  ]

  const actions: DataTableAction<Project>[] = [
    {
      label: "Visualizar",
      icon: Eye,
      onClick: (project) => {
        setViewDialog({ open: true, project })
      },
    },
    {
      label: "Editar",
      icon: Edit,
      onClick: (project) => {
        setEditingProject(project)
        setShowForm(true)
      },
    },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: (project) => {
        setDeleteDialog({ open: true, project })
      },
      variant: "destructive",
    },
  ]

  const handleCreateProject = () => {
    setEditingProject(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProject(null)
  }

  const handleFormSubmit = (project: Project) => {
    if (editingProject) {
      setProjects(projects.map((p) => (p.id === project.id ? project : p)))
    } else {
      setProjects([...projects, { ...project, id: Date.now().toString() }])
    }
    handleFormClose()
  }

  const confirmDeleteProject = () => {
    if (deleteDialog.project) {
      setProjects(projects.filter((p) => p.id !== deleteDialog.project?.id))
      setDeleteDialog({ open: false, project: null })
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setExportingData(false)
    alert("Dados exportados com sucesso!")
  }

  useEffect(() => {
    setProjects([
      {
        id: "1",
        name: "Marketing Digital Completo",
        client: "Empresa Teste LTDA",
        status: "in_progress",
        budget: 45000,
        deadline: "2025-12-15",
        description: "Projeto de marketing digital completo incluindo redes sociais, SEO e Google Ads",
      },
      {
        id: "2",
        name: "Desenvolvimento de E-commerce",
        client: "Loja Virtual ABC",
        status: "awaiting_payment",
        budget: 85000,
        deadline: "2025-11-30",
        description: "Desenvolvimento completo de plataforma e-commerce com integração de pagamentos",
      },
      {
        id: "3",
        name: "Campanha Black Friday",
        client: "TechCorp Marketing",
        status: "in_progress",
        budget: 25000,
        deadline: "2024-11-20",
        description: "Campanha de marketing para Black Friday 2024",
      },
      {
        id: "4",
        name: "Rebranding Completo",
        client: "Creative Partners",
        status: "in_progress",
        budget: 45000,
        deadline: "2024-12-15",
        description: "Rebranding completo incluindo logo, identidade visual e materiais gráficos",
      },
      {
        id: "5",
        name: "Website Institucional",
        client: "Digital Solutions",
        status: "completed",
        budget: 18000,
        deadline: "2024-10-30",
        description: "Desenvolvimento de website institucional responsivo",
      },
    ])
  }, [])

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200">
      <div className="max-w-7xl bg-slate-200 mx-0 my-0 px-0 py-0 space-y-6">
        <PageHeader
          title="Projetos"
          description="Gerencie todos os seus projetos em um só lugar"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExportData} disabled={exportingData}>
                <Download className="h-4 w-4 mr-2" />
                {exportingData ? "Exportando..." : "Exportar"}
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projectStats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              <div className={`${stat.color} h-full`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">{stat.title}</p>
                      <p className="text-3xl font-bold mt-2 text-white">{stat.value}</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <DataTable
              title=""
              columns={columns}
              rows={projects}
              isLoading={loading}
              error={error}
              actions={actions}
              searchable={true}
              searchPlaceholder="Buscar projetos..."
              onCreateNew={handleCreateProject}
              createButtonLabel={
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Projeto
                </>
              }
              emptyMessage="Nenhum projeto cadastrado"
              className="w-full"
            />
          </CardContent>
        </Card>

        <ProjectModalForm
          open={showForm}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          initialData={editingProject}
        />

        <ConfirmationDialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, project: null })}
          onConfirm={confirmDeleteProject}
          title="Confirmar Exclusão"
          message={`Tem certeza que deseja excluir o projeto "${deleteDialog.project?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
        />

        <ConfirmationDialog
          open={viewDialog.open}
          onClose={() => setViewDialog({ open: false, project: null })}
          onConfirm={() => setViewDialog({ open: false, project: null })}
          title={viewDialog.project?.name || "Detalhes do Projeto"}
          message={
            viewDialog.project ? (
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Cliente:</p>
                  <p className="text-sm text-gray-600">{viewDialog.project.client}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Descrição:</p>
                  <p className="text-sm text-gray-600">{viewDialog.project.description || "Sem descrição"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Orçamento:</p>
                  <p className="text-sm text-gray-600">R$ {viewDialog.project.budget?.toLocaleString() || "0"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Prazo:</p>
                  <p className="text-sm text-gray-600">{viewDialog.project.deadline}</p>
                </div>
              </div>
            ) : ""
          }
          confirmText="Fechar"
        />
      </div>
    </div>
  )
}
