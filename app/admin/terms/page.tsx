// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, Users, Calendar, Settings } from "lucide-react"
import { TermManagementModal } from "@/components/admin/term-management-modal"
import { TermConditionsModal } from "@/components/admin/term-conditions-modal"
import { TermAcceptanceHistory } from "@/components/admin/term-acceptance-history"
import type { Term } from "@/types/terms"

export default function TermsManagementPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConditionsModal, setShowConditionsModal] = useState(false)
  const [showAcceptanceHistory, setShowAcceptanceHistory] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mock data - replace with API call
  const mockTerms: Term[] = [
    {
      id: "term-1",
      name: "Termos de Serviço Gerais",
      version: "2.1",
      content: "Conteúdo dos termos de serviço...",
      type: "terms_of_service",
      is_active: true,
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-20T14:30:00Z",
      created_by: "admin-1",
      conditions: [
        {
          id: "cond-1",
          term_id: "term-1",
          condition_type: "account_type",
          condition_value: "agency",
          is_required: true,
          created_at: "2024-01-15T10:00:00Z",
        },
      ],
    },
    {
      id: "term-2",
      name: "Política de Privacidade",
      version: "1.5",
      content: "Conteúdo da política de privacidade...",
      type: "privacy_policy",
      is_active: true,
      created_at: "2024-01-10T09:00:00Z",
      updated_at: "2024-01-18T16:45:00Z",
      created_by: "admin-1",
      conditions: [],
    },
    {
      id: "term-3",
      name: "Termos para Nômades Partner",
      version: "1.0",
      content: "Termos específicos para nômades Partner...",
      type: "custom",
      is_active: true,
      created_at: "2024-01-25T11:00:00Z",
      updated_at: "2024-01-25T11:00:00Z",
      created_by: "admin-2",
      conditions: [
        {
          id: "cond-2",
          term_id: "term-3",
          condition_type: "account_level",
          condition_value: "partner",
          is_required: true,
          created_at: "2024-01-25T11:00:00Z",
        },
      ],
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
      version: "1.0",
      content: termData.content || "",
      type: termData.type || "custom",
      is_active: true,
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
            <CardTitle className="text-sm font-medium">Com Condições</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terms.filter((t) => t.conditions.length > 0).length}</div>
            <p className="text-xs text-muted-foreground">Termos condicionais</p>
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
                <TableHead>Condições</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(term.type)}>{getTypeLabel(term.type)}</Badge>
                  </TableCell>
                  <TableCell>v{term.version}</TableCell>
                  <TableCell>
                    {term.conditions.length > 0 ? (
                      <Badge variant="outline">{term.conditions.length} condição(ões)</Badge>
                    ) : (
                      <span className="text-muted-foreground">Nenhuma</span>
                    )}
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
                            setShowConditionsModal(true)
                          }}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Condições
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

      <TermConditionsModal open={showConditionsModal} onOpenChange={setShowConditionsModal} term={selectedTerm} />

      <TermAcceptanceHistory open={showAcceptanceHistory} onOpenChange={setShowAcceptanceHistory} />
    </div>
  )
}
