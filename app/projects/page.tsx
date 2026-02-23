// @ts-nocheck
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/data-table"
import { type Project, apiClient } from "@/lib/api"
import { ProjectModalForm } from "@/components/project-modal-form"
import { useToast } from "@/hooks/use-toast"
import { Plus, Eye, Edit, Trash2 } from "lucide-react"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

const statusColors = {
  planning: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  planning: "Planejamento",
  active: "Ativo",
  on_hold: "Em Espera",
  completed: "Concluído",
  cancelled: "Cancelado",
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project?: Project }>({
    open: false,
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getProjects()
      setProjects(data)
    } catch (error) {
      const errorMessage = "Falha ao carregar projetos"
      setError(errorMessage)
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = () => {
    setEditingProject(undefined)
    setShowForm(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  const handleDeleteProject = (project: Project) => {
    setDeleteDialog({ open: true, project })
  }

  const confirmDeleteProject = async () => {
    const project = deleteDialog.project
    if (!project) return

    try {
      await apiClient.deleteProject(project.id)
      toast({
        title: "Sucesso",
        description: "Projeto excluído com sucesso",
      })
      loadProjects()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir projeto",
        variant: "destructive",
      })
    } finally {
      setDeleteDialog({ open: false })
    }
  }

  const handleFormSubmit = (project: Project) => {
    loadProjects()
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProject(undefined)
  }

  const formatCurrency = (value?: number) => {
    if (!value) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const columns: DataTableColumn<Project>[] = [
    {
      field: "name",
      headerName: "Nome",
      width: 200,
      renderCell: (value) => <div className="font-medium text-sm truncate max-w-[150px] sm:max-w-none">{value}</div>,
    },
    {
      field: "client",
      headerName: "Cliente",
      width: 150,
      renderCell: (value) => <div className="text-sm truncate max-w-[120px] sm:max-w-none">{value?.name || "-"}</div>,
    },
    {
      field: "manager",
      headerName: "Gerente",
      width: 150,
      renderCell: (value) => <div className="text-sm truncate max-w-[120px] sm:max-w-none">{value?.name || "-"}</div>,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (value) => (
        <Badge className={`${statusColors[value as keyof typeof statusColors]} text-xs`}>
          {statusLabels[value as keyof typeof statusLabels]}
        </Badge>
      ),
    },
    {
      field: "budget",
      headerName: "Orçamento",
      width: 120,
      renderCell: (value) => <div className="text-sm font-mono">{formatCurrency(value)}</div>,
    },
    {
      field: "start_date",
      headerName: "Data de Início",
      width: 120,
      renderCell: (value) => <div className="text-sm">{formatDate(value)}</div>,
    },
  ]

  const actions: DataTableAction<Project>[] = [
    {
      label: "Visualizar",
      icon: <Eye className="w-4 h-4" />,
      onClick: (project) => {
        window.location.href = `/projects/${project.id}`
      },
      variant: "ghost",
    },
    {
      label: "Editar",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEditProject,
      variant: "ghost",
    },
    {
      label: "Excluir",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteProject,
      variant: "ghost",
    },
  ]

  return (
    <div className="p-4 sm:p-6">
      <DataTable
        title="Projetos"
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

      <ProjectModalForm
        open={showForm}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingProject}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={confirmDeleteProject}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o projeto "${deleteDialog.project?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />
    </div>
  )
}
