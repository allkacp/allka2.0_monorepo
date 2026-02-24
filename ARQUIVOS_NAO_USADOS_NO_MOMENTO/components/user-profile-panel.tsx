
import type React from "react"

import { useState } from "react"
import { X, User, Mail, Phone, Briefcase, Calendar, Upload, Lock, Bell, Globe, Palette, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"

interface UserProfilePanelProps {
  open: boolean
  onClose: () => void
}

export function UserProfilePanel({ open, onClose }: UserProfilePanelProps) {
  const { userProfile, updateUserProfile, sidebarCollapsed } = useSidebar()
  const [formData, setFormData] = useState(userProfile)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"profile" | "settings">("profile")

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)
  const [language, setLanguage] = useState("pt-BR")
  const [theme, setTheme] = useState("light")

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

  const handleSaveProfile = () => {
    updateUserProfile(formData)
    onClose()
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const leftPosition = sidebarCollapsed ? "left-16" : "left-64"

  if (!open) return null

  return (
    <>
      <div className={`fixed ${leftPosition} top-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200 transition-all`} onClick={onClose} />

      <div className={`fixed ${leftPosition} right-0 top-0 h-full bg-white dark:bg-slate-900 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col border-l border-gray-200 dark:border-gray-800 transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas informações</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Section Tabs - Reduced padding for more compact tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveSection("profile")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-all relative",
              activeSection === "profile"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </div>
            {activeSection === "profile" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-all relative",
              activeSection === "settings"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Palette className="h-4 w-4" />
              Preferências
            </div>
            {activeSection === "settings" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
        </div>

        {/* Content - Added proper ScrollArea with calculated height and reduced padding */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5">
            {activeSection === "profile" ? (
              <div className="space-y-5">
                {/* Avatar Section - Reduced avatar size and spacing */}
                <div className="flex flex-col items-center space-y-3 pb-5">
                  <div className="relative">
                    <Avatar className="h-28 w-28 ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-xl">
                      <AvatarImage
                        src={avatarPreview || (formData.avatar.startsWith("data:") ? formData.avatar : undefined)}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                        {formData.avatar.length <= 2 ? formData.avatar : getUserInitials(formData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-full shadow-lg">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        Alterar Foto
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

                <Separator className="dark:bg-gray-800" />

                {/* Personal Information - Reduced spacing and made single column for better scrolling */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    Informações Pessoais
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                        Nome Completo
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome completo"
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="email@exemplo.com"
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        Telefone
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                        Cargo
                      </Label>
                      <Input
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                        placeholder="Seu cargo"
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="department" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                        Departamento
                      </Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                        placeholder="Departamento"
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="joinDate" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        Data de Ingresso
                      </Label>
                      <Input
                        id="joinDate"
                        type="date"
                        value={formData.joinDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, joinDate: e.target.value }))}
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="dark:bg-gray-800" />

                {/* Security Section - Made more compact */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    Segurança
                  </h3>

                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Proteja sua conta</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Altere sua senha regularmente
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Lock className="h-3.5 w-3.5 mr-2" />
                      Alterar Senha
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Notifications Settings - Reduced spacing and padding */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    Notificações
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications" className="text-sm font-medium cursor-pointer dark:text-white">
                          E-mail
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notificações importantes</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications" className="text-sm font-medium cursor-pointer dark:text-white">
                          Push
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notificações em tempo real</p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="weekly-reports" className="text-sm font-medium cursor-pointer dark:text-white">
                          Relatórios
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Resumo semanal</p>
                      </div>
                      <Switch id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
                    </div>
                  </div>
                </div>

                <Separator className="dark:bg-gray-800" />

                {/* Language Settings - Reduced spacing */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    Idioma e Região
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="language" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Idioma
                      </Label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pt-BR">🇧🇷 Português</option>
                        <option value="en-US">🇺🇸 English</option>
                        <option value="es-ES">🇪🇸 Español</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Separator className="dark:bg-gray-800" />

                {/* Theme Settings - Made more compact with smaller preview boxes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                    Tema
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTheme("light")}
                      className={cn(
                        "p-3 border-2 rounded-xl transition-all",
                        theme === "light"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                          : "border-gray-200 dark:border-gray-800 hover:border-blue-300",
                      )}
                    >
                      <div className="w-full h-12 bg-white rounded-lg mb-2 border shadow-sm" />
                      <p className="text-xs font-semibold">Claro</p>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "p-3 border-2 rounded-xl transition-all",
                        theme === "dark"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                          : "border-gray-200 dark:border-gray-800 hover:border-blue-300",
                      )}
                    >
                      <div className="w-full h-12 bg-gray-900 rounded-lg mb-2 border shadow-sm" />
                      <p className="text-xs font-semibold">Escuro</p>
                    </button>
                    <button
                      onClick={() => setTheme("auto")}
                      className={cn(
                        "p-3 border-2 rounded-xl transition-all",
                        theme === "auto"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                          : "border-gray-200 dark:border-gray-800 hover:border-blue-300",
                      )}
                    >
                      <div className="w-full h-12 bg-gradient-to-r from-white to-gray-900 rounded-lg mb-2 border shadow-sm" />
                      <p className="text-xs font-semibold">Auto</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Reduced padding for more compact footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
            onClick={handleSaveProfile}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    </>
  )
}
