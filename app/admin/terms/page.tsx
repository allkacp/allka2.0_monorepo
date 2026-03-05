// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, Users, Calendar, Building2, User } from "lucide-react"
import { TermManagementModal } from "@/components/admin/term-management-modal"
import { TermAcceptanceHistory } from "@/components/admin/term-acceptance-history"
import type { Term } from "@/types/terms"

export default function TermsManagementPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAcceptanceHistory, setShowAcceptanceHistory] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mock data - replace with API call
  const mockTerms: Term[] = [
    {
      id: "term-1",
      name: "Termo de Uso da Plataforma (Empresa)",
      version: "2.1",
      content: "Ao utilizar esta plataforma como representante de uma empresa, você concorda com os presentes Termos de Uso...\n\n1. Da Aceitação\nO presente instrumento regula as condições de uso da Plataforma Allka para pessoas jurídicas...\n\n2. Das Obrigações\nA empresa usuária compromete-se a utilizar a plataforma de forma lícita e ética...",
      type: "terms_of_service",
      is_active: true,
      is_mandatory: true,
      acceptance_level: "empresa",
      target_account_types: ["empresas"],
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-03-01T14:30:00Z",
      created_by: "admin-1",
      conditions: [],
    },
    {
      id: "term-2",
      name: "Termo de Uso do Usuário",
      version: "1.5",
      content: "Estes Termos de Uso regulam o acesso individual à Plataforma Allka por qualquer usuário cadastrado...\n\n1. Identificação\nO usuário declara ser maior de 18 anos e ter capacidade civil plena...\n\n2. Uso Responsável\nO usuário é responsável pela guarda de suas credenciais de acesso...",
      type: "terms_of_service",
      is_active: true,
      is_mandatory: true,
      acceptance_level: "usuario",
      target_account_types: ["empresas", "agencias", "nomades"],
      created_at: "2024-01-10T09:00:00Z",
      updated_at: "2024-02-18T16:45:00Z",
      created_by: "admin-1",
      conditions: [],
    },
    {
      id: "term-3",
      name: "Política de Privacidade",
      version: "1.2",
      content: "Esta Política de Privacidade descreve como coletamos, usamos e protegemos seus dados pessoais na Plataforma Allka, em conformidade com a LGPD (Lei nº 13.709/2018)...\n\n1. Dados Coletados\nColetamos dados de identificação, contato e navegação...\n\n2. Finalidade\nOs dados são usados para prestação do serviço, melhoria da plataforma e comunicações...",
      type: "privacy_policy",
      is_active: true,
      is_mandatory: true,
      acceptance_level: "usuario",
      target_account_types: ["empresas", "agencias", "nomades"],
      created_at: "2024-01-10T09:00:00Z",
      updated_at: "2024-02-10T12:00:00Z",
      created_by: "admin-1",
      conditions: [],
    },
    {
      id: "term-4",
      name: "Acordo de Agência Parceira",
      version: "1.0",
      content: "Ao se cadastrar como Agência na Plataforma Allka, a agência concorda com as condições específicas deste acordo...\n\n1. Responsabilidades\nA agência é responsável pelos projetos gerenciados em seu nome...\n\n2. Comissionamento\nAs regras de comissionamento estão definidas na área financeira da plataforma...",
      type: "service_agreement",
      is_active: true,
      is_mandatory: true,
      acceptance_level: "empresa",
      target_account_types: ["agencias"],
      created_at: "2024-01-25T11:00:00Z",
      updated_at: "2024-01-25T11:00:00Z",
      created_by: "admin-2",
      conditions: [],
    },
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTerms(mockTerms)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredTerms = terms.filter(
    (term) =>
      term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getTypeLabel = (type: string) => {
    const labels = {
      privacy_policy: "Política de Privacidade",
      terms_of_service: "Termos de Serviço",
      data_processing: "Processamento de Dados",
      service_agreement: "Acordo de Serviços",
      custom: "Personalizado",
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTypeColor = (type: string) => {
    const colors = {
      privacy_policy: "bg-blue-100 text-blue-800",
      terms_of_service: "bg-green-100 text-green-800",
      data_processing: "bg-purple-100 text-purple-800",
      service_agreement: "bg-orange-100 text-orange-800",
      custom: "bg-gray-100 text-gray-800",
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const handleCreateTerm = (termData: Partial<Term>) => {
    const newTerm: Term = {
      id: `term-${Date.now()}`,
      name: termData.name || "",
      version: termData.version || "1.0",
      content: termData.content || "",
      type: termData.type || "custom",
      is_active: termData.is_active ?? true,
      is_mandatory: termData.is_mandatory ?? true,
      acceptance_level: termData.acceptance_level || "usuario",
      target_account_types: termData.target_account_types || ["empresas"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "current-admin",
      conditions: [],
    }
    setTerms([...terms, newTerm])
    setShowCreateModal(false)
  }

  const handleEditTerm = (termData: Partial<Term>) => {
    if (!selectedTerm) return

    const updatedTerms = terms.map((term) =>
      term.id === selectedTerm.id ? { ...term, ...termData, updated_at: new Date().toISOString() } : term,
    )
    setTerms(updatedTerms)
    setShowEditModal(false)
    setSelectedTerm(null)
  }

  const handleDeleteTerm = (termId: string) => {
    setTerms(terms.filter((term) => term.id !== termId))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Termos</h1>
          <p className="text-muted-foreground">Gerencie todos os termos e documentos legais da plataforma</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Termo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Termos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terms.length}</div>
            <p className="text-xs text-muted-foreground">{terms.filter((t) => t.is_active).length} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nível Empresa</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terms.filter((t) => t.acceptance_level === "empresa").length}</div>
            <p className="text-xs text-muted-foreground">Termos p/ user master</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceites Hoje</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+12% vs ontem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2d</div>
            <p className="text-xs text-muted-foreground">Termos de Serviço</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Termos Cadastrados</CardTitle>
          <CardDescription>Gerencie todos os termos e suas condições de exibição</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar termos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={() => setShowAcceptanceHistory(true)}>
              <Users className="h-4 w-4 mr-2" />
              Histórico de Aceites
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Nível de Aceite</TableHead>
                <TableHead>Tipos de Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div>{term.name}</div>
                    {term.is_mandatory && (
                      <span className="text-xs text-orange-600 font-medium">Obrigatório</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(term.type)}>{getTypeLabel(term.type)}</Badge>
                  </TableCell>
                  <TableCell>v{term.version}</TableCell>
                  <TableCell>
                    {term.acceptance_level === "empresa" ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Empresa</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">Usuário</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(term.target_account_types || []).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs capitalize">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={term.is_active ? "default" : "secondary"}>
                      {term.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(term.updated_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTerm(term)
                            setShowEditModal(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTerm(term)
                            setShowAcceptanceHistory(true)
                          }}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Histórico de Aceites
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTerm(term.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <TermManagementModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSave={handleCreateTerm}
        mode="create"
      />

      <TermManagementModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSave={handleEditTerm}
        mode="edit"
        term={selectedTerm}
      />

      <TermAcceptanceHistory open={showAcceptanceHistory} onOpenChange={setShowAcceptanceHistory} />
    </div>
  )
}
