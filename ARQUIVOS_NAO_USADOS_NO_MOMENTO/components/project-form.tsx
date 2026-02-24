
import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Project, type Client, type User, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ProjectFormProps {
  project?: Project
  onSubmit: (project: Project) => void
  onCancel: () => void
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [formData, setFormData] = useState({
    name: project?.name || "",
    description: project?.description || "",
    client_id: project?.client_id?.toString() || "",
    manager_id: project?.manager_id?.toString() || "",
    status: project?.status || ("planning" as const),
    start_date: project?.start_date || "",
    end_date: project?.end_date || "",
    budget: project?.budget?.toString() || "",
  })

  useEffect(() => {
    const loadData = async () => {
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
    loadData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const projectData = {
        ...formData,
        client_id: Number.parseInt(formData.client_id),
        manager_id: Number.parseInt(formData.manager_id),
        budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
      }

      let result: Project
      if (project) {
        result = await apiClient.updateProject(project.id, projectData)
      } else {
        result = await apiClient.createProject(projectData)
      }

      toast({
        title: "Sucesso",
        description: `Projeto ${project ? "atualizado" : "criado"} com sucesso`,
      })

      onSubmit(result)
    } catch (error) {
      toast({
        title: "Erro",
        description: `Falha ao ${project ? "atualizar" : "criar"} projeto`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{project ? "Editar Projeto" : "Novo Projeto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(value) => handleChange("client_id", value)}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Gerente *</Label>
              <Select value={formData.manager_id} onValueChange={(value) => handleChange("manager_id", value)}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
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
                onChange={(e) => handleChange("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Orçamento</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              value={formData.budget}
              onChange={(e) => handleChange("budget", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : project ? "Atualizar" : "Criar"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
