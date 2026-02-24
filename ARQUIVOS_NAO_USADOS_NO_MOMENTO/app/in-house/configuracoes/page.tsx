
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Bell, Shield, CreditCard, Users, Mail, Phone, MapPin, Save, Upload } from "lucide-react"
import { PageHeader } from "@/components/page-header" // Fixed import to use named export with correct path

export default function InHouseConfiguracoesPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    alert("Configurações salvas com sucesso!")
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 px-0 py-0 space-y-6">
        <div className="px-0">
          <PageHeader
            title="Configurações"
            description="Gerencie as configurações da sua conta e preferências"
            actions={
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            }
          />
        </div>

        <div className="px-0">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white shadow-lg">
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
              <TabsTrigger value="billing">Pagamentos</TabsTrigger>
              <TabsTrigger value="team">Equipe</TabsTrigger>
            </TabsList>

            {/* Company Settings */}
            <TabsContent value="company" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                    Informações da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label>Logo da Empresa</Label>
                      <p className="text-sm text-gray-500 mb-2">Recomendado: 400x400px, PNG ou JPG</p>
                      <Button variant="outline" className="bg-white hover:bg-gray-50">
                        <Upload className="h-4 w-4 mr-2" />
                        Fazer Upload
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome da Empresa</Label>
                      <Input id="company-name" defaultValue="Minha Empresa Ltda" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" defaultValue="12.345.678/0001-90" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email Corporativo
                      </Label>
                      <Input id="email" type="email" defaultValue="contato@minhaempresa.com" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Telefone
                      </Label>
                      <Input id="phone" defaultValue="(11) 98765-4321" className="bg-white" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Endereço
                      </Label>
                      <Input id="address" defaultValue="Av. Paulista, 1000 - São Paulo, SP" className="bg-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Bell className="h-5 w-5 mr-2 text-blue-600" />
                    Preferências de Notificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: "Novos Projetos", description: "Receba notificações quando novos projetos forem criados" },
                    {
                      title: "Atualizações de Status",
                      description: "Seja notificado sobre mudanças de status em projetos",
                    },
                    { title: "Pagamentos", description: "Alertas sobre pagamentos pendentes e confirmados" },
                    { title: "Mensagens da Equipe", description: "Notificações de mensagens e menções" },
                    { title: "Relatórios Semanais", description: "Resumo semanal de atividades e métricas" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Segurança da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Autenticação de Dois Fatores</p>
                          <p className="text-sm text-gray-600">Adicione uma camada extra de segurança</p>
                        </div>
                        <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">Ativo</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-password">Senha Atual</Label>
                      <Input id="current-password" type="password" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input id="new-password" type="password" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input id="confirm-password" type="password" className="bg-white" />
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      Atualizar Senha
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                    Métodos de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Cartão de Crédito</p>
                          <p className="text-sm text-gray-600">•••• •••• •••• 4532</p>
                          <p className="text-xs text-gray-500">Expira em 12/2025</p>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">Principal</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-white hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Novo Método
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Settings */}
            <TabsContent value="team" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Gerenciamento de Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div>
                      <p className="font-medium text-gray-900">Membros da Equipe</p>
                      <p className="text-sm text-gray-600">Gerencie permissões e acessos</p>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      Ver Equipe
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div>
                      <p className="font-medium text-gray-900">Convites Pendentes</p>
                      <p className="text-sm text-gray-600">2 convites aguardando resposta</p>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      2 Pendentes
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
