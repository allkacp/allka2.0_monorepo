
import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, User, Lock, Bell, Shield, Palette, BarChart3 } from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { Switch } from "@/components/ui/switch"
import { UserUsageDashboard } from "@/components/user-usage-dashboard"

interface UserProfileModalProps {
  open: boolean
  onClose: () => void
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { userProfile, updateUserProfile } = useSidebar()
  const [formData, setFormData] = useState(userProfile)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUserProfile(formData)
    onClose()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        setFormData((prev) => ({ ...prev, avatar: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-blue-600" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Uso</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Preferências</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                <Avatar className="h-28 w-28 ring-4 ring-blue-100">
                  <AvatarImage
                    src={avatarPreview || (formData.avatar.startsWith("data:") ? formData.avatar : undefined)}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                    {formData.avatar.length <= 2 ? formData.avatar : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg">
                      <Upload className="h-4 w-4" />
                      Alterar Foto de Perfil
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Função
                  </Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder="Cargo/função"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">
                    Departamento
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Departamento"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate" className="text-sm font-medium">
                    Data de Ingresso
                  </Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, joinDate: e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <UserUsageDashboard />
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-blue-900">Segurança da Conta</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Mantenha sua conta segura alterando sua senha regularmente
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm font-medium">
                    Senha Atual
                  </Label>
                  <Input id="current-password" type="password" placeholder="••••••••" className="border-gray-300" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    Nova Senha
                  </Label>
                  <Input id="new-password" type="password" placeholder="••••••••" className="border-gray-300" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirmar Nova Senha
                  </Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" className="border-gray-300" />
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">Alterar Senha</Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-sm font-medium">
                    Notificações por E-mail
                  </Label>
                  <p className="text-xs text-muted-foreground">Receba atualizações importantes por e-mail</p>
                </div>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-sm font-medium">
                    Notificações Push
                  </Label>
                  <p className="text-xs text-muted-foreground">Receba notificações em tempo real</p>
                </div>
                <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-reports" className="text-sm font-medium">
                    Relatórios Semanais
                  </Label>
                  <p className="text-xs text-muted-foreground">Receba um resumo semanal das suas atividades</p>
                </div>
                <Switch id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700">Salvar Preferências</Button>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Idioma</Label>
                <select className="w-full p-2 border border-gray-300 rounded-lg">
                  <option>Português (Brasil)</option>
                  <option>English (US)</option>
                  <option>Español</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Fuso Horário</Label>
                <select className="w-full p-2 border border-gray-300 rounded-lg">
                  <option>América/São Paulo (GMT-3)</option>
                  <option>América/Nova York (GMT-5)</option>
                  <option>Europa/Lisboa (GMT+0)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tema</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-3 border-2 border-blue-600 rounded-lg bg-white text-sm font-medium">
                    Claro
                  </button>
                  <button className="p-3 border rounded-lg bg-gray-100 text-sm font-medium hover:border-blue-600">
                    Escuro
                  </button>
                  <button className="p-3 border rounded-lg bg-gray-100 text-sm font-medium hover:border-blue-600">
                    Auto
                  </button>
                </div>
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700">Salvar Preferências</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
