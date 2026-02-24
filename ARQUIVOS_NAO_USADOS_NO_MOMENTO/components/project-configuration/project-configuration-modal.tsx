
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Settings, Users, FileText, Shield, CreditCard, Zap, Plus, Trash2, Eye, EyeOff, Lock } from "lucide-react"
import type { ProjectConfiguration, PaymentMode, ProjectVaultItem } from "@/types/project-configuration"

interface ProjectConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  projectName: string
}

export default function ProjectConfigurationModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ProjectConfigurationModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<ProjectConfiguration | null>(null)
  const [activeTab, setActiveTab] = useState("identification")

  // Vault state
  const [vaultItems, setVaultItems] = useState<ProjectVaultItem[]>([])
  const [showVaultItem, setShowVaultItem] = useState<Record<number, boolean>>({})
  const [newVaultItem, setNewVaultItem] = useState({
    title: "",
    type: "password" as const,
    content: "",
  })

  // Responsible users state
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string }>>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])

  useEffect(() => {
    if (isOpen) {
      loadConfiguration()
      loadAvailableUsers()
    }
  }, [isOpen, projectId])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      // Load existing configuration or create default
      const response = await fetch(`/api/projects/${projectId}/configuration`)
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setSelectedUsers(data.responsible_users || [])
      } else {
        // Create default configuration
        const defaultConfig: Partial<ProjectConfiguration> = {
          project_id: projectId,
          responsible_users: [],
          auto_save_attachments: false,
          file_categories: ["Documentos", "Imagens", "Contratos", "Relatórios"],
          vault_enabled: false,
          vault_permissions: [],
          payment_mode: "SQUAD",
          payment_config: {},
          auto_task_distribution: false,
          auto_approval_on_timeout: false,
          auto_approval_timeout_hours: 48,
        }
        setConfig(defaultConfig as ProjectConfiguration)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações do projeto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const users = await response.json()
        setAvailableUsers(users)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  const saveConfiguration = async () => {
    if (!config) return

    try {
      setLoading(true)
      const updatedConfig = {
        ...config,
        responsible_users: selectedUsers,
      }

      const response = await fetch(`/api/projects/${projectId}/configuration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações do projeto salvas com sucesso",
        })
        onClose()
      } else {
        throw new Error("Failed to save configuration")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addVaultItem = async () => {
    if (!newVaultItem.title || !newVaultItem.content) return

    try {
      const response = await fetch(`/api/projects/${projectId}/vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVaultItem),
      })

      if (response.ok) {
        const item = await response.json()
        setVaultItems([...vaultItems, item])
        setNewVaultItem({ title: "", type: "password", content: "" })
        toast({
          title: "Sucesso",
          description: "Item adicionado ao cofre",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar item ao cofre",
        variant: "destructive",
      })
    }
  }

  const toggleVaultItemVisibility = (itemId: number) => {
    setShowVaultItem((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  if (!config) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Projeto: {projectName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identification" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Identificação
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Arquivos
            </TabsTrigger>
            <TabsTrigger value="vault" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Cofre
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Automações
            </TabsTrigger>
          </TabsList>

          {/* Identification Tab */}
          <TabsContent value="identification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Responsáveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Selecionar Responsáveis</Label>
                  <Select
                    onValueChange={(value) => {
                      const userId = Number.parseInt(value)
                      if (!selectedUsers.includes(userId)) {
                        setSelectedUsers([...selectedUsers, userId])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers
                        .filter((user) => !selectedUsers.includes(user.id))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = availableUsers.find((u) => u.id === userId)
                    return user ? (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                        {user.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => setSelectedUsers(selectedUsers.filter((id) => id !== userId))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ) : null
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Arquivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Salvar Anexos de Tarefas Automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Anexos de tarefas serão salvos automaticamente na central de arquivos
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_save_attachments}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_save_attachments: checked })}
                  />
                </div>

                <div>
                  <Label>Categorias de Arquivos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.file_categories.map((category, index) => (
                      <Badge key={index} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vault Tab */}
          <TabsContent value="vault" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Cofre Criptografado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Habilitar Cofre</Label>
                    <p className="text-sm text-muted-foreground">
                      Armazenamento seguro para senhas e informações sensíveis
                    </p>
                  </div>
                  <Switch
                    checked={config.vault_enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, vault_enabled: checked })}
                  />
                </div>

                {config.vault_enabled && (
                  <>
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Adicionar Item ao Cofre</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={newVaultItem.title}
                            onChange={(e) => setNewVaultItem({ ...newVaultItem, title: e.target.value })}
                            placeholder="Ex: Senha do Admin"
                          />
                        </div>
                        <div>
                          <Label>Tipo</Label>
                          <Select
                            value={newVaultItem.type}
                            onValueChange={(value: any) => setNewVaultItem({ ...newVaultItem, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="password">Senha</SelectItem>
                              <SelectItem value="api_key">Chave API</SelectItem>
                              <SelectItem value="certificate">Certificado</SelectItem>
                              <SelectItem value="note">Nota Segura</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Conteúdo</Label>
                        <Textarea
                          value={newVaultItem.content}
                          onChange={(e) => setNewVaultItem({ ...newVaultItem, content: e.target.value })}
                          placeholder="Conteúdo sensível..."
                        />
                      </div>
                      <Button onClick={addVaultItem} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar ao Cofre
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Itens no Cofre</h4>
                      {vaultItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground capitalize">{item.type}</div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => toggleVaultItemVisibility(item.id)}>
                            {showVaultItem[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Modalidade de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Modalidade</Label>
                  <Select
                    value={config.payment_mode}
                    onValueChange={(value: PaymentMode) => setConfig({ ...config, payment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SQUAD">SQUAD</SelectItem>
                      <SelectItem value="POST_PAID">Pagamento Pós-Pago</SelectItem>
                      <SelectItem value="EXTERNAL">Pagamento Externo (Permuta/Gratuito)</SelectItem>
                      <SelectItem value="INTERNAL">Projeto Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.payment_mode === "SQUAD" && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Configuração SQUAD</h4>
                    <p className="text-sm text-muted-foreground">Configure a distribuição entre membros do squad</p>
                  </div>
                )}

                {config.payment_mode === "POST_PAID" && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Configuração Pós-Pago</h4>
                    <div>
                      <Label>Taxa por Hora (R$)</Label>
                      <Input
                        type="number"
                        value={config.payment_config.post_paid_rate || ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            payment_config: {
                              ...config.payment_config,
                              post_paid_rate: Number.parseFloat(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {config.payment_mode === "EXTERNAL" && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Pagamento Externo</h4>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={config.payment_config.external_type || ""}
                        onValueChange={(value) =>
                          setConfig({
                            ...config,
                            payment_config: {
                              ...config.payment_config,
                              external_type: value as any,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="barter">Permuta</SelectItem>
                          <SelectItem value="free">Gratuito</SelectItem>
                          <SelectItem value="partnership">Parceria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={config.payment_config.external_description || ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            payment_config: {
                              ...config.payment_config,
                              external_description: e.target.value,
                            },
                          })
                        }
                        placeholder="Descreva os termos do acordo..."
                      />
                    </div>
                  </div>
                )}

                {config.payment_mode === "INTERNAL" && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Projeto Interno</h4>
                    <div>
                      <Label>Departamento</Label>
                      <Input
                        value={config.payment_config.internal_department || ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            payment_config: {
                              ...config.payment_config,
                              internal_department: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Centro de Custo</Label>
                      <Input
                        value={config.payment_config.internal_cost_center || ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            payment_config: {
                              ...config.payment_config,
                              internal_cost_center: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Automações do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Distribuição Automática de Tarefas</Label>
                    <p className="text-sm text-muted-foreground">
                      Tarefas serão distribuídas automaticamente para nômades qualificados
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_task_distribution}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_task_distribution: checked })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Aprovação Automática por Prazo</Label>
                      <p className="text-sm text-muted-foreground">
                        Tarefas serão aprovadas automaticamente se o prazo for excedido
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_approval_on_timeout}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_approval_on_timeout: checked })}
                    />
                  </div>

                  {config.auto_approval_on_timeout && (
                    <div>
                      <Label>Prazo para Aprovação Automática (horas)</Label>
                      <Input
                        type="number"
                        value={config.auto_approval_timeout_hours}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            auto_approval_timeout_hours: Number.parseInt(e.target.value),
                          })
                        }
                        min="1"
                        max="168"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={saveConfiguration} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
