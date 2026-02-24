
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, CreditCard, FileText, Shield, Settings, Calendar, CheckCircle } from "lucide-react"
import { CompanyProfile } from "@/components/user-management/company-profile"
import { BillingManagement } from "@/components/account/billing-management"
import { AcceptedTermsHistory } from "@/components/account/accepted-terms-history"
import type { Company, User as UserType } from "@/types/user"

interface MyAccountTabsProps {
  company: Company | null
  currentUser: UserType | null
}

export function MyAccountTabs({ company, currentUser }: MyAccountTabsProps) {
  const [activeTab, setActiveTab] = useState("profile")

  if (!company || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isMasterUser = currentUser.role === "company_admin" || currentUser.role === "agency_admin"
  const isAgencyAccount = currentUser.account_type === "agencias"

  return (
    <div className="space-y-6">
      {/* Account Header */}
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
                <CardTitle className="text-2xl">Minha Conta</CardTitle>
                <CardDescription className="text-base">{company.name}</CardDescription>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={company.account_type === "independent" ? "default" : "secondary"}>
                    {company.account_type === "independent" ? "Independente" : "Dependente"}
                  </Badge>
                  <Badge variant={company.is_active ? "default" : "destructive"}>
                    {company.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                  {isMasterUser && (
                    <Badge variant="outline" className="text-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Master
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="billing" disabled={!isAgencyAccount}>
            <CreditCard className="h-4 w-4 mr-2" />
            Faturamento
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={!isMasterUser}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="terms">
            <FileText className="h-4 w-4 mr-2" />
            Termos
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Calendar className="h-4 w-4 mr-2" />
            Atividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <CompanyProfile company={company} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="billing">
          {isAgencyAccount ? (
            <BillingManagement company={company} currentUser={currentUser} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Faturamento não disponível</h3>
                  <p className="text-muted-foreground">
                    Esta funcionalidade está disponível apenas para contas de agência
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings">
          {isMasterUser ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Conta</CardTitle>
                  <CardDescription>Gerencie as configurações gerais da sua conta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Dados Bancários</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Configure as informações bancárias para recebimento
                      </p>
                      <Button variant="outline" size="sm">
                        Gerenciar Dados Bancários
                      </Button>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cartões de Crédito</h4>
                      <p className="text-sm text-muted-foreground mb-3">Gerencie os métodos de pagamento da conta</p>
                      <Button variant="outline" size="sm">
                        Gerenciar Cartões
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Acesso restrito</h3>
                  <p className="text-muted-foreground">
                    Apenas usuários master podem acessar as configurações da conta
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="terms">
          <AcceptedTermsHistory company={company} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Atividade da Conta</CardTitle>
              <CardDescription>Histórico de ações e alterações na conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Conta criada</p>
                    <p className="text-xs text-muted-foreground">{new Date(company.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Última atualização do perfil</p>
                    <p className="text-xs text-muted-foreground">{new Date(company.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
