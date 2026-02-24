
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, User, Bell, Shield, Palette, Mail, Phone, MapPin, Globe, Upload, Save } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export default function AgenciasConfiguracoesPage() {
  const [agencyData, setAgencyData] = useState({
    name: "Allka Digital",
    cnpj: "12.345.678/0001-90",
    email: "contato@allka.digital",
    phone: "(11) 99999-9999",
    website: "https://allka.digital",
    location: "São Paulo, SP",
    description: "Agência especializada em marketing digital e desenvolvimento",
  })

  const [personalData, setPersonalData] = useState({
    fullName: "João Silva",
    role: "Gestor de Agência",
    email: "joao@allka.digital",
    phone: "(11) 98888-8888",
    department: "Gestão",
    joinDate: "2023-01-15",
  })

  const [notifications, setNotifications] = useState({
    newProjects: true,
    projectUpdates: true,
    payments: true,
    ledAgencies: true,
    newsletter: false,
    promotions: false,
  })

  const [preferences, setPreferences] = useState({
    darkMode: false,
    animations: true,
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
  })

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactor: false,
  })

  const handleSaveAgency = () => {
    console.log("[v0] Saving agency data:", agencyData)
    alert("Informações da agência salvas com sucesso!")
  }

  const handleSavePersonal = () => {
    console.log("[v0] Saving personal data:", personalData)
    alert("Informações pessoais salvas com sucesso!")
  }

  const handleSaveNotifications = () => {
    console.log("[v0] Saving notifications:", notifications)
    alert("Preferências de notificação salvas com sucesso!")
  }

  const handleSavePreferences = () => {
    console.log("[v0] Saving preferences:", preferences)
    alert("Preferências da interface salvas com sucesso!")
  }

  const handleChangePassword = () => {
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      alert("Por favor, preencha todos os campos de senha.")
      return
    }
    if (security.newPassword !== security.confirmPassword) {
      alert("As senhas não coincidem.")
      return
    }
    console.log("[v0] Changing password")
    alert("Senha alterada com sucesso!")
    setSecurity({ ...security, currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleEndSession = (device: string) => {
    console.log("[v0] Ending session:", device)
    alert(`Sessão ${device} encerrada com sucesso!`)
  }

  const handleUploadLogo = () => {
    console.log("[v0] Uploading agency logo")
    alert("Funcionalidade de upload de logo será implementada em breve!")
  }

  const handleUploadAvatar = () => {
    console.log("[v0] Uploading personal avatar")
    alert("Funcionalidade de upload de foto será implementada em breve!")
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 px-0 py-0">
        <PageHeader title="Configurações" description="Gerencie as preferências e configurações da sua conta" />

        {/* Main Content */}
        <Tabs defaultValue="agency" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200">
            <TabsTrigger value="agency">Perfil da Agência</TabsTrigger>
            <TabsTrigger value="personal">Perfil Pessoal</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          {/* Agency Profile Tab */}
          <TabsContent value="agency" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Informações da Agência
                </h3>
                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-blue-100">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 bg-white border-gray-200 hover:bg-gray-50"
                        onClick={handleUploadLogo}
                      >
                        <Upload className="h-4 w-4" />
                        Alterar Logo
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG até 5MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="agency-name">Nome da Agência</Label>
                      <Input
                        id="agency-name"
                        value={agencyData.name}
                        onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={agencyData.cnpj}
                        onChange={(e) => setAgencyData({ ...agencyData, cnpj: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          value={agencyData.email}
                          onChange={(e) => setAgencyData({ ...agencyData, email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="phone"
                          value={agencyData.phone}
                          onChange={(e) => setAgencyData({ ...agencyData, phone: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="website"
                          value={agencyData.website}
                          onChange={(e) => setAgencyData({ ...agencyData, website: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localização</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="location"
                          value={agencyData.location}
                          onChange={(e) => setAgencyData({ ...agencyData, location: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={agencyData.description}
                      onChange={(e) => setAgencyData({ ...agencyData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="bg-white border-gray-200">
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                      onClick={handleSaveAgency}
                    >
                      <Save className="h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Profile Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Informações Pessoais
                </h3>
                <div className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-blue-100">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                        JS
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 bg-white border-gray-200 hover:bg-gray-50"
                        onClick={handleUploadAvatar}
                      >
                        <Upload className="h-4 w-4" />
                        Alterar Foto
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG até 5MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Nome Completo</Label>
                      <Input
                        id="full-name"
                        value={personalData.fullName}
                        onChange={(e) => setPersonalData({ ...personalData, fullName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Cargo</Label>
                      <Input
                        id="role"
                        value={personalData.role}
                        onChange={(e) => setPersonalData({ ...personalData, role: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personal-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="personal-email"
                          type="email"
                          value={personalData.email}
                          onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personal-phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="personal-phone"
                          value={personalData.phone}
                          onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento</Label>
                      <Input
                        id="department"
                        value={personalData.department}
                        onChange={(e) => setPersonalData({ ...personalData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="join-date">Data de Entrada</Label>
                      <Input
                        id="join-date"
                        type="date"
                        value={personalData.joinDate}
                        onChange={(e) => setPersonalData({ ...personalData, joinDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="bg-white border-gray-200">
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                      onClick={handleSavePersonal}
                    >
                      <Save className="h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Preferências de Notificação
                </h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Novos Projetos</p>
                        <p className="text-sm text-gray-600">Receba notificações sobre novos projetos disponíveis</p>
                      </div>
                      <Switch
                        checked={notifications.newProjects}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newProjects: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Atualizações de Projetos</p>
                        <p className="text-sm text-gray-600">Notificações sobre mudanças em projetos ativos</p>
                      </div>
                      <Switch
                        checked={notifications.projectUpdates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, projectUpdates: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Pagamentos</p>
                        <p className="text-sm text-gray-600">Alertas sobre pagamentos recebidos e pendentes</p>
                      </div>
                      <Switch
                        checked={notifications.payments}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, payments: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Agências Lideradas</p>
                        <p className="text-sm text-gray-600">Atualizações sobre agências sob sua liderança</p>
                      </div>
                      <Switch
                        checked={notifications.ledAgencies}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, ledAgencies: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Newsletter</p>
                        <p className="text-sm text-gray-600">Receba novidades e dicas da plataforma</p>
                      </div>
                      <Switch
                        checked={notifications.newsletter}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newsletter: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Promoções</p>
                        <p className="text-sm text-gray-600">Ofertas especiais e descontos exclusivos</p>
                      </div>
                      <Switch
                        checked={notifications.promotions}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, promotions: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="bg-white border-gray-200">
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                      onClick={handleSaveNotifications}
                    >
                      <Save className="h-4 w-4" />
                      Salvar Preferências
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Segurança da Conta
                </h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <h4 className="font-medium text-gray-900 mb-4">Alterar Senha</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Senha Atual</Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={security.currentPassword}
                            onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-password">Nova Senha</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={security.newPassword}
                            onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={security.confirmPassword}
                            onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                          />
                        </div>
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={handleChangePassword}
                        >
                          Atualizar Senha
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Autenticação de Dois Fatores</p>
                        <p className="text-sm text-gray-600">Adicione uma camada extra de segurança à sua conta</p>
                      </div>
                      <Switch
                        checked={security.twoFactor}
                        onCheckedChange={(checked) => {
                          setSecurity({ ...security, twoFactor: checked })
                          alert(
                            checked
                              ? "Autenticação de dois fatores ativada!"
                              : "Autenticação de dois fatores desativada!",
                          )
                        }}
                      />
                    </div>

                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <h4 className="font-medium text-gray-900 mb-2">Sessões Ativas</h4>
                      <p className="text-sm text-gray-600 mb-4">Gerencie os dispositivos conectados à sua conta</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div>
                            <p className="font-medium text-sm">Chrome - Windows</p>
                            <p className="text-xs text-gray-600">São Paulo, Brasil • Ativo agora</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-gray-200"
                            onClick={() => handleEndSession("Chrome - Windows")}
                          >
                            Encerrar
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div>
                            <p className="font-medium text-sm">Safari - iPhone</p>
                            <p className="text-xs text-gray-600">São Paulo, Brasil • Há 2 horas</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-gray-200"
                            onClick={() => handleEndSession("Safari - iPhone")}
                          >
                            Encerrar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-blue-600" />
                  Preferências da Interface
                </h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Modo Escuro</p>
                        <p className="text-sm text-gray-600">Ativar tema escuro na interface</p>
                      </div>
                      <Switch
                        checked={preferences.darkMode}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, darkMode: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Animações</p>
                        <p className="text-sm text-gray-600">Habilitar animações e transições</p>
                      </div>
                      <Switch
                        checked={preferences.animations}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, animations: checked })}
                      />
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <Label htmlFor="language" className="font-medium text-gray-900">
                        Idioma
                      </Label>
                      <p className="text-sm text-gray-600 mb-3">Selecione o idioma da interface</p>
                      <Select
                        value={preferences.language}
                        onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                      <Label htmlFor="timezone" className="font-medium text-gray-900">
                        Fuso Horário
                      </Label>
                      <p className="text-sm text-gray-600 mb-3">Configure seu fuso horário</p>
                      <Select
                        value={preferences.timezone}
                        onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">América/São Paulo (GMT-3)</SelectItem>
                          <SelectItem value="America/New_York">América/New York (GMT-5)</SelectItem>
                          <SelectItem value="Europe/Lisbon">Europa/Lisboa (GMT+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="bg-white border-gray-200">
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                      onClick={handleSavePreferences}
                    >
                      <Save className="h-4 w-4" />
                      Salvar Preferências
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
