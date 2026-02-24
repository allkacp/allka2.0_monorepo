
import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { type Project, type Client, type User, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ProjectModalFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (project: Project) => void
  initialData?: Project
}

interface FormData {
  name: string
  description: string
  client_id: string
  manager_id: string
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  start_date: string
  end_date: string
  budget: string
}

interface FormErrors {
  name?: string
  client_id?: string
  manager_id?: string
}

export function ProjectModalForm({ open, onClose, onSubmit, initialData }: ProjectModalFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    client_id: "",
    manager_id: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget: "",
  })

  // Carrega dados necessários para o formulário
  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [clientsData, usersData] = await Promise.all([apiClient.getClients(), apiClient.getUsers()])
        setClients(clientsData)
        setUsers(usersData.filter((user) => user.role === "manager" || user.role === "admin"))
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao carregar dados do formulário",
          variant: "destructive",
        })
      }
    }

    if (open) {
      loadFormData()
    }
  }, [open, toast])

  // Preenche o formulário quando há dados iniciais (modo de edição)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        client_id: initialData.client_id?.toString() || "",
        manager_id: initialData.manager_id?.toString() || "",
        status: initialData.status || "planning",
        start_date: initialData.start_date || "",
        end_date: initialData.end_date || "",
        budget: initialData.budget?.toString() || "",
      })
    } else {
      // Limpa o formulário para modo de criação
      setFormData({
        name: "",
        description: "",
        client_id: "",
        manager_id: "",
        status: "planning",
        start_date: "",
        end_date: "",
        budget: "",
      })
    }
    setErrors({})
  }, [initialData, open])

  // Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome do projeto é obrigatório"
    }

    if (!formData.client_id) {
      newErrors.client_id = "Cliente é obrigatório"
    }

    if (!formData.manager_id) {
      newErrors.manager_id = "Gerente é obrigatório"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Função de submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        client_id: Number.parseInt(formData.client_id),
        manager_id: Number.parseInt(formData.manager_id),
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
      }

      let result: Project
      if (initialData) {
        // Modo de edição
        result = await apiClient.updateProject(initialData.id, projectData)
        toast({
          title: "Sucesso",
          description: "Projeto atualizado com sucesso",
        })
      } else {
        // Modo de criação
        result = await apiClient.createProject(projectData)
        toast({
          title: "Sucesso",
          description: "Projeto criado com sucesso",
        })
      }

      onSubmit(result)
      onClose()
    } catch (error) {
      toast({
        title: "Erro",
        description: `Falha ao ${initialData ? "atualizar" : "criar"} projeto`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para cancelar e fechar a modal
  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      client_id: "",
      manager_id: "",
      status: "planning",
      start_date: "",
      end_date: "",
      budget: "",
    })
    setErrors({})
    onClose()
  }

  // Função para atualizar campos do formulário
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Projeto */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              placeholder="Digite o nome do projeto"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o projeto"
              rows={3}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          {/* Cliente e Gerente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(value) => updateField("client_id", value)}>
                <SelectTrigger className={errors.client_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Gerente *</Label>
              <Select value={formData.manager_id} onValueChange={(value) => updateField("manager_id", value)}>
                <SelectTrigger className={errors.manager_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione um gerente" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.manager_id && <p className="text-sm text-red-500">{errors.manager_id}</p>}
            </div>
          </div>

          {/* Status, Data de Início e Data de Fim */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planejamento</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="on_hold">Em Espera</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* Orçamento */}
          <div className="space-y-2">
            <Label htmlFor="budget">Orçamento</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.budget}
              onChange={(e) => updateField("budget", e.target.value)}
            />
          </div>

          {/* Botões de Ação */}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : initialData ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
