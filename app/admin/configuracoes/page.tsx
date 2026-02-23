// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Bell, Shield, Palette, Globe, Save } from "lucide-react"
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel"
import { PageHeader } from "@/components/page-header"

export default function AdminConfiguracoesPage() {
  const [settings, setSettings] = useState({
    siteName: "ALLKA Platform",
    siteDescription: "Plataforma de gestão de projetos e tarefas",
    supportEmail: "suporte@allka.com",
    enableRegistration: true,
    enableNotifications: true,
    maintenanceMode: false,
    requireEmailVerification: true,
    maxFileSize: 10,
    sessionTimeout: 30,
  })

  const handleSave = () => {
    console.log("[v0] Saving settings:", settings)
    // Save settings logic here
  }

  return (
    <div className="container mx-auto space-y-6 px-0 py-0">
      <PageHeader
        title="Configurações da Plataforma"
        description="Gerencie as configurações gerais do sistema"
        action={
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="siteName">Nome da Plataforma</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="supportEmail">Email de Suporte</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="siteDescription">Descrição da Plataforma</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Permitir Novos Cadastros</Label>
                    <p className="text-sm text-gray-600">Usuários podem criar novas contas</p>
                  </div>
                  <Switch
                    checked={settings.enableRegistration}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableRegistration: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Modo de Manutenção</Label>
                    <p className="text-sm text-gray-600">Desabilita acesso temporariamente</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurações de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="smtpHost">Servidor SMTP</Label>
                  <Input id="smtpHost" placeholder="smtp.example.com" />
                </div>
                <div>
                  <Label htmlFor="smtpPort">Porta SMTP</Label>
                  <Input id="smtpPort" type="number" placeholder="587" />
                </div>
                <div>
                  <Label htmlFor="smtpUser">Usuário SMTP</Label>
                  <Input id="smtpUser" placeholder="user@example.com" />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">Senha SMTP</Label>
                  <Input id="smtpPassword" type="password" placeholder="••••••••" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline">Testar Configuração de Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Gerenciamento de Notificações
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure as preferências de notificação, canais de comunicação, regras de distribuição e grupos de
                usuários.
              </p>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesPanel embedded={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Verificação de Email Obrigatória</Label>
                  <p className="text-sm text-gray-600">Usuários devem verificar email antes de usar a plataforma</p>
                </div>
                <Switch
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                <div>
                  <Label htmlFor="maxFileSize">Tamanho Máximo de Arquivo (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={settings.maxFileSize}
                    onChange={(e) => setSettings({ ...settings, maxFileSize: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">Políticas de Senha</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Comprimento Mínimo: 8 caracteres</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Exigir Letras Maiúsculas e Minúsculas</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Exigir Números</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Exigir Caracteres Especiais</Label>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configurações de Aparência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-4 mt-2">
                  <Input id="primaryColor" type="color" defaultValue="#3B82F6" className="w-20 h-10" />
                  <Input defaultValue="#3B82F6" className="flex-1" />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex gap-4 mt-2">
                  <Input id="secondaryColor" type="color" defaultValue="#10B981" className="w-20 h-10" />
                  <Input defaultValue="#10B981" className="flex-1" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="logo">Logo da Plataforma</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600">Clique para fazer upload ou arraste uma imagem</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG até 2MB</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="favicon">Favicon</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600">Clique para fazer upload ou arraste uma imagem</p>
                  <p className="text-xs text-gray-500 mt-1">ICO, PNG 32x32px</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
