
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Copy, Calendar, DollarSign, User } from "lucide-react"
import { type Project, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ProjectCloneModalProps {
  open: boolean
  onClose: () => void
}

interface CloneOptions {
  includeTasks: boolean
  includeTeam: boolean
  includeBudget: boolean
  includeTimeline: boolean
  includeDocuments: boolean
}

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

export function ProjectCloneModal({ open, onClose }: ProjectCloneModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({
    includeTasks: true,
    includeTeam: false,
    includeBudget: true,
    includeTimeline: false,
    includeDocuments: true,
  })

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!open) return

      try {
        const data = await apiClient.getProjects()
        setProjects(data)
        setFilteredProjects(data)
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao carregar projetos",
          variant: "destructive",
        })
      }
    }

    loadProjects()
  }, [open, toast])

  // Filter projects based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.client?.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredProjects(filtered)
    }
  }, [searchTerm, projects])

  // Update new project name when project is selected
  useEffect(() => {
    if (selectedProject) {
      setNewProjectName(`${selectedProject.name} - Cópia`)
    }
  }, [selectedProject])

  const handleCloneProject = async () => {
    if (!selectedProject || !newProjectName.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um projeto e defina um nome para a cópia",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/projects/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceProjectId: selectedProject.id,
          newProjectName,
          cloneOptions,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Projeto clonado com sucesso!",
        })
        onClose()
        window.location.reload()
      } else {
        throw new Error("Failed to clone project")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao clonar projeto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCloneOption = (option: keyof CloneOptions, value: boolean) => {
    setCloneOptions((prev) => ({ ...prev, [option]: value }))
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clonar Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Project Selection */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Buscar Projetos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, descrição ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all ${
                      selectedProject?.id === project.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                          {statusLabels[project.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      {project.description && (
                        <CardDescription className="text-sm">{project.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{project.client?.name || "Sem cliente"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(project.budget)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(project.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Gerente:</span>
                          <span>{project.manager?.name || "Não definido"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum projeto encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Clone Configuration */}
          <div className="w-80 border-l pl-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-4">Configuração da Cópia</h3>

              {selectedProject && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newName">Nome do Novo Projeto</Label>
                    <Input
                      id="newName"
                      placeholder="Nome do projeto clonado"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>O que incluir na cópia:</Label>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTasks"
                          checked={cloneOptions.includeTasks}
                          onCheckedChange={(checked) => updateCloneOption("includeTasks", checked as boolean)}
                        />
                        <Label htmlFor="includeTasks" className="text-sm">
                          Tarefas e estrutura do projeto
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTeam"
                          checked={cloneOptions.includeTeam}
                          onCheckedChange={(checked) => updateCloneOption("includeTeam", checked as boolean)}
                        />
                        <Label htmlFor="includeTeam" className="text-sm">
                          Equipe e atribuições
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeBudget"
                          checked={cloneOptions.includeBudget}
                          onCheckedChange={(checked) => updateCloneOption("includeBudget", checked as boolean)}
                        />
                        <Label htmlFor="includeBudget" className="text-sm">
                          Orçamento e valores
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTimeline"
                          checked={cloneOptions.includeTimeline}
                          onCheckedChange={(checked) => updateCloneOption("includeTimeline", checked as boolean)}
                        />
                        <Label htmlFor="includeTimeline" className="text-sm">
                          Cronograma e prazos
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeDocuments"
                          checked={cloneOptions.includeDocuments}
                          onCheckedChange={(checked) => updateCloneOption("includeDocuments", checked as boolean)}
                        />
                        <Label htmlFor="includeDocuments" className="text-sm">
                          Documentos e anexos
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={handleCloneProject}
                      disabled={loading || !newProjectName.trim()}
                      className="w-full"
                    >
                      {loading ? "Clonando..." : "Clonar Projeto"}
                    </Button>
                    <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {!selectedProject && (
                <div className="text-center py-8 text-muted-foreground">
                  <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione um projeto para configurar a cópia</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
