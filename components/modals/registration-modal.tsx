// @ts-nocheck
import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, UserCheck, Shield, Briefcase, CheckCircle2, AlertCircle, Zap } from "lucide-react"
import type { AccountType, AccountSubType } from "@/types/user"
import { useAccountType } from "@/contexts/account-type-context"

interface RegistrationModalProps {
  open: boolean
  onClose: () => void
}

interface RegistrationForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  accountType: AccountType | null
  accountSubType: AccountSubType | null
  companyName?: string
  document?: string
  phone?: string
}

const accountTypes = [
  {
    type: "empresas" as AccountType,
    subType: "company" as AccountSubType,
    icon: Building2,
    title: "Empresa (Dependente)",
    description: "Empresa gerenciada por agência parceira",
    color: "bg-blue-500",
  },
  {
    type: "empresas" as AccountType,
    subType: "in-house" as AccountSubType,
    icon: Briefcase,
    title: "Empresa (In-House)",
    description: "Empresa com equipe interna e acesso total ao catálogo",
    color: "bg-purple-500",
  },
  {
    type: "agencias" as AccountType,
    subType: null,
    icon: Users,
    title: "Agência",
    description: "Agência parceira gerenciando múltiplos clientes",
    color: "bg-green-500",
  },
  {
    type: "nomades" as AccountType,
    subType: null,
    icon: UserCheck,
    title: "Nômade",
    description: "Profissional freelancer executando tarefas",
    color: "bg-orange-500",
  },
  {
    type: "admin" as AccountType,
    subType: null,
    icon: Shield,
    title: "Administrador",
    description: "Acesso administrativo completo à plataforma",
    color: "bg-red-500",
  },
]

export function RegistrationModal({ open, onClose }: RegistrationModalProps) {
  const [step, setStep] = useState<"select" | "form" | "success">("select")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulatedUser, setSimulatedUser] = useState<string | null>(null)
  const { setAccountType, lockAccountType } = useAccountType()
  const [form, setForm] = useState<RegistrationForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: null,
    accountSubType: null,
    companyName: "",
    document: "",
    phone: "",
  })

  const handleSelectAccountType = (type: AccountType, subType: AccountSubType | null) => {
    setForm({ ...form, accountType: type, accountSubType: subType })
    setStep("form")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!form.name || !form.email || !form.password) {
      setError("Por favor, preencha todos os campos obrigatórios")
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    if ((form.accountType === "empresas" || form.accountType === "agencias") && !form.companyName) {
      setError("Nome da empresa/agência é obrigatório")
      return
    }

    setLoading(true)

    try {
      // Call registration API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          account_type: form.accountType,
          account_sub_type: form.accountSubType,
          company_name: form.companyName,
          document: form.document,
          phone: form.phone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erro ao criar conta")
      }

      setStep("success")
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateAccount = () => {
    if (!form.accountType) return

    // Create mock user data based on account type
    const mockUsers = {
      empresas: {
        company: {
          name: "João Silva (Empresa Dependente)",
          email: "joao.empresa@teste.com",
          companyName: "Empresa Demo Ltda",
        },
        "in-house": {
          name: "Maria Santos (In-House)",
          email: "maria.inhouse@teste.com",
          companyName: "Tech Solutions Inc",
        },
      },
      agencias: {
        name: "Carlos Oliveira (Agência)",
        email: "carlos.agencia@teste.com",
        companyName: "Agência Criativa Digital",
      },
      nomades: {
        name: "Ana Costa (Nômade)",
        email: "ana.nomade@teste.com",
      },
      admin: {
        name: "Admin Sistema",
        email: "admin@allka.com",
      },
    }

    let mockUser
    if (form.accountType === "empresas" && form.accountSubType) {
      mockUser = mockUsers.empresas[form.accountSubType]
    } else {
      mockUser = mockUsers[form.accountType]
    }

    setAccountType(form.accountType, form.accountSubType)
    lockAccountType()

    // Store mock user in localStorage for simulation
    localStorage.setItem(
      "simulatedUser",
      JSON.stringify({
        ...mockUser,
        accountType: form.accountType,
        accountSubType: form.accountSubType,
        isSimulated: true,
      }),
    )

    window.dispatchEvent(new Event("simulationCreated"))

    setSimulatedUser(mockUser.name)
    setStep("success")
  }

  const handleClose = () => {
    setStep("select")
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: null,
      accountSubType: null,
      companyName: "",
      document: "",
      phone: "",
    })
    setError(null)
    setSimulatedUser(null)
    onClose()
  }

  const selectedAccountType = accountTypes.find(
    (at) => at.type === form.accountType && at.subType === form.accountSubType,
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Conta</DialogTitle>
          <DialogDescription>
            {step === "select" && "Selecione o tipo de conta que deseja criar"}
            {step === "form" && "Preencha os dados para criar sua conta"}
            {step === "success" && simulatedUser ? "Conta simulada criada com sucesso!" : "Conta criada com sucesso!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Account Type */}
        {step === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {accountTypes.map((accountType) => (
              <Card
                key={`${accountType.type}-${accountType.subType}`}
                className="cursor-pointer hover:border-primary transition-all duration-200 hover:shadow-lg"
                onClick={() => handleSelectAccountType(accountType.type, accountType.subType)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${accountType.color} text-white`}>
                      <accountType.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{accountType.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{accountType.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Selected Account Type Badge */}
            {selectedAccountType && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${selectedAccountType.color} text-white`}>
                    <selectedAccountType.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedAccountType.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedAccountType.description}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep("select")}>
                  Alterar
                </Button>
              </div>
            )}

            {/* Simulation Notice Banner */}
            <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Modo de Teste Disponível</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Use o botão "Simular Conta" abaixo para testar o sistema sem criar uma conta real. Isso permite
                  visualizar o fluxo de navegação como se estivesse logado.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Informações Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Company/Agency Information */}
            {(form.accountType === "empresas" || form.accountType === "agencias") && (
              <div className="space-y-4">
                <h3 className="font-semibold">
                  Informações da {form.accountType === "empresas" ? "Empresa" : "Agência"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Nome da {form.accountType === "empresas" ? "Empresa" : "Agência"}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="Nome da organização"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document">CNPJ</Label>
                    <Input
                      id="document"
                      value={form.document}
                      onChange={(e) => setForm({ ...form, document: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-4">
              <h3 className="font-semibold">Senha</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Senha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repita a senha"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Simulation Button */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-100"
                onClick={handleSimulateAccount}
              >
                <Zap className="h-4 w-4 mr-2" />
                Simular Conta (Teste)
              </Button>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setStep("select")}>
                  Voltar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            {simulatedUser ? (
              <>
                <div className="p-4 bg-amber-100 dark:bg-amber-950/30 rounded-full">
                  <Zap className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">Conta Simulada Criada!</h3>
                  <p className="text-muted-foreground max-w-md">
                    Você está agora navegando como <span className="font-semibold">{simulatedUser}</span>. Esta é uma
                    conta de teste e nenhum dado foi salvo.
                  </p>
                  <div className="pt-2">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Modo de Teste Ativo
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={handleClose} size="lg" variant="default">
                  Começar a Explorar
                </Button>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">Conta Criada com Sucesso!</h3>
                  <p className="text-muted-foreground">
                    Sua conta foi criada. Você já pode fazer login e começar a usar a plataforma.
                  </p>
                </div>
                <Button onClick={handleClose} size="lg">
                  Fazer Login
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
