import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import React, { useState, useEffect, useRef } from "react"
import { Camera, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/contexts/sidebar-context"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { useToast } from "@/hooks/use-toast"

interface UserCreateSlidePanelProps {
  open: boolean
  onClose: () => void
  onUserCreated?: (user: any) => void
}

export function UserCreateSlidePanel({ open, onClose, onUserCreated }: UserCreateSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sidebarWidth } = useSidebar()
  const { toast } = useToast()

  // Estado do novo usuário
  const [newUser, setNewUser] = useState({
    // Etapa 1 - Conta
    name: "",
    email: "",
    username: "",
    account_type: "empresas",
    role: "company_user",
    is_active: true,
    plan: "free",
    // Etapa 2 - Dados
    cpf: "",
    birth_date: "",
    phone: "",
    whatsapp: "",
    cep: "",
    street: "",
    number: "",
    city: "",
    state: "",
    notes: "",
    // Etapa 3 - Permissões
    permissions: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Permissões disponíveis
  const permissionsByCategory = {
    Projetos: [
      { id: "view_projects", label: "Visualizar Projetos" },
      { id: "create_projects", label: "Criar Projetos" },
      { id: "edit_projects", label: "Editar Projetos" },
      { id: "cancel_projects", label: "Cancelar Projetos" },
    ],
    Usuários: [
      { id: "manage_users", label: "Gerenciar Usuários" },
    ],
    Financeiro: [
      { id: "view_payments", label: "Visualizar Pagamentos" },
      { id: "manage_payments", label: "Gerenciar Pagamentos" },
    ],
    Relatórios: [
      { id: "view_analytics", label: "Visualizar Análises" },
    ],
    Sistema: [
      { id: "admin_access", label: "Acesso Admin" },
    ],
  }

  // Define panel positioning - Extends from sidebar to right edge
  const [panelStyle, setPanelStyle] = useState<{ left: string; width: string }>({
    left: "240px",
    width: "calc(100vw - 240px)"
  })

  useEffect(() => {
    const calculatePanelStyle = () => {
      const sidebarWidthPx = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(sidebarWidth as string) || 240
      setPanelStyle({
        left: `${sidebarWidthPx}px`,
        width: `calc(100vw - ${sidebarWidthPx}px)`
      })
    }
    calculatePanelStyle()
    window.addEventListener("resize", calculatePanelStyle)
    return () => window.removeEventListener("resize", calculatePanelStyle)
  }, [sidebarWidth])

  useEffect(() => {
    if (!open) {
      setIsClosing(false)
    }
  }, [open])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setCurrentStep(1)
      setNewUser({
        name: "",
        email: "",
        username: "",
        account_type: "empresas",
        role: "company_user",
        is_active: true,
        plan: "free",
        cpf: "",
        birth_date: "",
        phone: "",
        whatsapp: "",
        cep: "",
        street: "",
        number: "",
        city: "",
        state: "",
        notes: "",
        permissions: [],
      })
      setAvatarPreview(null)
      setErrors({})
    }, 500)
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!newUser.name.trim()) newErrors.name = "Nome é obrigatório"
    if (!newUser.email.trim()) newErrors.email = "Email é obrigatório"
    if (!newUser.username.trim()) newErrors.username = "Username é obrigatório"
    if (!newUser.account_type) newErrors.account_type = "Tipo de usuário é obrigatório"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return
    setCurrentStep(currentStep + 1)
  }

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateUser = async () => {
    console.log("[v0] Criando novo usuário:", newUser)
    
    // Criar novo usuário com estrutura completa
    const createdUser = {
      id: Math.floor(Math.random() * 10000) + 100, // ID temporário
      ...newUser,
      account_sub_type: "in-house",
      company_id: 1,
      online_status: "offline",
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    }

    // Chamar callback para adicionar à lista
    if (onUserCreated) {
      onUserCreated(createdUser)
    }

    toast({
      title: "Sucesso",
      description: "Usuário criado com sucesso. Convite enviado por e-mail.",
    })

    handleClose()
  }

  const togglePermission = (permissionId: string) => {
    setNewUser({
      ...newUser,
      permissions: newUser.permissions.includes(permissionId)
        ? newUser.permissions.filter((p) => p !== permissionId)
        : [...newUser.permissions, permissionId],
    })
  }

  if (!open && !isClosing) return null

  return (
    <>
      <div
        className={cn(
          "fixed top-0 z-40 h-[calc(100vh-32px)]",
          "bg-background overflow-hidden flex flex-col",
          "transition-all duration-500 ease-in-out",
          isClosing ? "slide-out-to-right opacity-0" : "slide-in-from-right opacity-100",
        )}
        style={{
          left: panelStyle.left,
          width: panelStyle.width,
          display: open && !isClosing ? "flex" : "none"
        }}
      >
        {/* Header with brand theme */}
        <ModalBrandHeader
          title="Criar Novo Usuário"
          left={
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-blue-300/50">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                    {newUser.name ? newUser.name.charAt(0).toUpperCase() : "N"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 rounded-full p-1.5 text-white transition-colors border border-blue-950"
                  type="button"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-xs text-blue-200">Etapa {currentStep} de 3</p>
              </div>
            </div>
          }
          onClose={handleClose}
        />

        {/* Conteúdo com Scroll Interno */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* ETAPA 1: CONTA */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="Ex: joao@empresa.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Username / Login *</Label>
                  <Input
                    placeholder="Ex: joao.silva"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className={errors.username ? "border-red-500" : ""}
                  />
                  {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Usuário *</Label>
                  <Select value={newUser.account_type} onValueChange={(value) => setNewUser({ ...newUser, account_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresas">Empresas</SelectItem>
                      <SelectItem value="agencias">Agências</SelectItem>
                      <SelectItem value="nomades">Nômades</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_type && <p className="text-xs text-red-500">{errors.account_type}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status da Conta *</Label>
                    <Select
                      value={newUser.is_active ? "ativo" : "inativo"}
                      onValueChange={(value) => setNewUser({ ...newUser, is_active: value === "ativo" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nível / Plano *</Label>
                    <Select value={newUser.plan} onValueChange={(value) => setNewUser({ ...newUser, plan: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: DADOS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-4">Dados Pessoais</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        placeholder="XXX.XXX.XXX-XX"
                        value={newUser.cpf}
                        onChange={(e) => setNewUser({ ...newUser, cpf: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={newUser.birth_date}
                        onChange={(e) => setNewUser({ ...newUser, birth_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-4">Contato</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(11) 98765-4321"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        placeholder="(11) 98765-4321"
                        value={newUser.whatsapp}
                        onChange={(e) => setNewUser({ ...newUser, whatsapp: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-4">Endereço</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input
                        placeholder="01310-100"
                        value={newUser.cep}
                        onChange={(e) => setNewUser({ ...newUser, cep: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rua</Label>
                      <Input
                        placeholder="Ex: Rua das Flores"
                        value={newUser.street}
                        onChange={(e) => setNewUser({ ...newUser, street: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          placeholder="123"
                          value={newUser.number}
                          onChange={(e) => setNewUser({ ...newUser, number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          placeholder="São Paulo"
                          value={newUser.city}
                          onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        value={newUser.state}
                        onChange={(e) => setNewUser({ ...newUser, state: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-4">Informações Adicionais</h3>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Notas sobre o usuário..."
                      value={newUser.notes}
                      onChange={(e) => setNewUser({ ...newUser, notes: e.target.value })}
                      className="h-24"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: PERMISSÕES */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Selecione as permissões para este usuário</p>
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <Card key={category} className="p-4">
                    <h3 className="font-semibold text-sm mb-3">{category}</h3>
                    <div className="space-y-2">
                      {permissions.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={perm.id}
                            checked={newUser.permissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="rounded"
                          />
                          <label htmlFor={perm.id} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - FIXO */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={currentStep === 1 ? "invisible" : ""}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {currentStep < 3 ? (
            <Button
              onClick={handleNextStep}
              className="btn-brand"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateUser}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Criar Usuário
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
