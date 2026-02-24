
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Users, Calendar, AlertTriangle, CheckCircle, Brain, Edit, Plus, Shield } from "lucide-react"
import type { Company, User } from "@/types/user"

interface CompanyProfileProps {
  company: Company
  currentUser: User
}

export function CompanyProfile({ company, currentUser }: CompanyProfileProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const isActive = company.is_active
  const isAdmin = currentUser.role === "company_admin"
  const daysSinceLastProject = company.last_project_date
    ? Math.floor((new Date().getTime() - new Date(company.last_project_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-blue-600 text-white text-xl">
                  {company.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{company.name}</CardTitle>
                <CardDescription className="text-base">{company.email}</CardDescription>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={company.account_type === "independent" ? "default" : "secondary"}>
                    {company.account_type === "independent" ? "Independente" : "Dependente"}
                  </Badge>
                  <Badge variant={isActive ? "default" : "destructive"}>{isActive ? "Ativa" : "Inativa"}</Badge>
                  {company.agency && <Badge variant="outline">Via {company.agency.name}</Badge>}
                </div>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Status Alert */}
      {!isActive && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Conta Inativa</p>
                <p className="text-sm text-orange-600">
                  {daysSinceLastProject
                    ? `Sem projetos há ${daysSinceLastProject} dias. Contas são inativadas após 90 dias sem projetos.`
                    : "Esta conta não possui projetos ativos."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="ai-knowledge">Base de Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {company.users.filter((u) => u.role === "company_admin").length} administradores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.projects.filter((p) => p.status === "active").length}</div>
                <p className="text-xs text-muted-foreground">{company.projects.length} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Último Projeto</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysSinceLastProject ? `${daysSinceLastProject}d` : "N/A"}</div>
                <p className="text-xs text-muted-foreground">
                  {company.last_project_date
                    ? new Date(company.last_project_date).toLocaleDateString()
                    : "Nenhum projeto"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Account Type Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Tipo de Operação</h4>
                  <p className="text-sm text-muted-foreground">
                    {company.account_type === "independent"
                      ? "Contratação direta da plataforma (In-House). Acesso total ao catálogo com valores cheios."
                      : "Cliente vinculado a agência parceira. Acesso limitado a projetos ativos e sistema de aprovação."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Permissões</h4>
                  <div className="flex flex-wrap gap-1">
                    {company.account_type === "independent" ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          Catálogo Completo
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Contratação Direta
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Gestão Autônoma
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs">
                          Projetos Ativos
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Aprovação Cadenciada
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Via Agência
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Usuários da Empresa</h3>
            {isAdmin && (
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {company.users.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === "company_admin" ? "default" : "secondary"}>
                        {user.role === "company_admin" ? "Administrador" : "Usuário"}
                      </Badge>
                      {user.role === "company_admin" && <Shield className="h-4 w-4 text-blue-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <h3 className="text-lg font-medium">Histórico de Projetos</h3>

          <div className="grid gap-4">
            {company.projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          project.status === "active"
                            ? "default"
                            : project.status === "completed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {project.status === "active"
                          ? "Ativo"
                          : project.status === "completed"
                            ? "Concluído"
                            : project.status === "paused"
                              ? "Pausado"
                              : "Cancelado"}
                      </Badge>
                      {project.status === "active" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-knowledge" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-medium">Base de Conhecimento IA</h3>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo da Empresa</CardTitle>
              <CardDescription>Informações mantidas automaticamente pela IA da Allka</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {company.ai_knowledge_base.summary || "Nenhum resumo disponível ainda."}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Última atualização: {new Date(company.ai_knowledge_base.last_updated).toLocaleDateString()}</span>
                <Badge variant="outline" className="text-xs">
                  {company.ai_knowledge_base.auto_generated ? "Auto-gerado" : "Manual"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Briefings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.ai_knowledge_base.briefing_history.slice(0, 3).map((brief, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3">
                      <p className="font-medium text-sm">{brief.project_name}</p>
                      <p className="text-xs text-muted-foreground">{brief.brief_summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(brief.date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Padrões de Contratação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.ai_knowledge_base.contracting_patterns.slice(0, 3).map((pattern, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{pattern.service_type}</p>
                        <p className="text-xs text-muted-foreground">{pattern.frequency}x contratado</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">R$ {pattern.average_budget.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{pattern.preferred_timeline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
