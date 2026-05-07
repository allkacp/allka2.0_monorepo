// @ts-nocheck
import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import {
  Globe, Mail, Bell, Shield, Palette, Save, Eye, EyeOff,
  CheckCircle2, RotateCcw,
} from "lucide-react";

export default function AdminConfiguracoesPage() {
  useSidebar();
  const { toast } = useToast();

  const [general, setGeneral] = useState({
    siteName: "ALLKA Platform",
    siteDescription: "Plataforma de gestão de projetos e tarefas",
    supportEmail: "suporte@allka.com",
    enableRegistration: true,
    maintenanceMode: false,
  });

  const [smtp, setSmtp] = useState({
    host: "", port: "587", user: "", password: "",
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [security, setSecurity] = useState({
    requireEmailVerification: true,
    maxFileSize: 10,
    sessionTimeout: 30,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: false,
    minLength: 8,
  });

  const [appearance, setAppearance] = useState({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
  });

  function save(section) {
    toast({ title: `${section} salvo com sucesso` });
  }

  function SectionCard({ icon: Icon, title, description, children, onSave }) {
    return (
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
              {description && <p className="text-xs text-slate-400">{description}</p>}
            </div>
          </div>
          {onSave && (
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={onSave}>
              <Save className="h-3 w-3" /> Salvar
            </Button>
          )}
        </div>
        <div className="p-5 space-y-5">{children}</div>
      </Card>
    );
  }

  function ToggleRow({ label, description, checked, onCheckedChange }) {
    return (
      <div className="flex items-start justify-between gap-4 py-0.5">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie as configurações gerais da plataforma</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="h-8 text-xs flex-wrap">
          <TabsTrigger value="general"       className="text-xs px-3">Geral</TabsTrigger>
          <TabsTrigger value="email"         className="text-xs px-3">Email</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs px-3">Notificações</TabsTrigger>
          <TabsTrigger value="security"      className="text-xs px-3">Segurança</TabsTrigger>
          <TabsTrigger value="appearance"    className="text-xs px-3">Aparência</TabsTrigger>
        </TabsList>

        {/* ── Geral ── */}
        <TabsContent value="general" className="space-y-4">
          <SectionCard icon={Globe} title="Informações da Plataforma" onSave={() => save("Configurações gerais")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da Plataforma</Label>
                <Input className="h-9 text-sm" value={general.siteName}
                  onChange={e => setGeneral(g => ({ ...g, siteName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email de Suporte</Label>
                <Input type="email" className="h-9 text-sm" value={general.supportEmail}
                  onChange={e => setGeneral(g => ({ ...g, supportEmail: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea className="text-sm resize-none" rows={3} value={general.siteDescription}
                onChange={e => setGeneral(g => ({ ...g, siteDescription: e.target.value }))} />
            </div>
          </SectionCard>

          <SectionCard icon={Globe} title="Acesso e Operação">
            <ToggleRow
              label="Permitir Novos Cadastros"
              description="Usuários podem criar novas contas na plataforma"
              checked={general.enableRegistration}
              onCheckedChange={v => { setGeneral(g => ({ ...g, enableRegistration: v })); toast({ title: `Cadastros ${v ? "habilitados" : "desabilitados"}` }); }}
            />
            <ToggleRow
              label="Modo de Manutenção"
              description="Desabilita o acesso de usuários temporariamente"
              checked={general.maintenanceMode}
              onCheckedChange={v => { setGeneral(g => ({ ...g, maintenanceMode: v })); toast({ title: `Modo manutenção ${v ? "ativado" : "desativado"}` }); }}
            />
          </SectionCard>
        </TabsContent>

        {/* ── Email ── */}
        <TabsContent value="email" className="space-y-4">
          <SectionCard icon={Mail} title="Configurações SMTP" description="Servidor de envio de emails" onSave={() => save("SMTP")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Servidor SMTP</Label>
                <Input placeholder="smtp.example.com" className="h-9 text-sm"
                  value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Porta</Label>
                <Input type="number" placeholder="587" className="h-9 text-sm"
                  value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário SMTP</Label>
                <Input placeholder="user@example.com" className="h-9 text-sm"
                  value={smtp.user} onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha SMTP</Label>
                <div className="relative">
                  <Input type={showSmtpPass ? "text" : "password"} placeholder="••••••••" className="h-9 text-sm pr-9"
                    value={smtp.password} onChange={e => setSmtp(s => ({ ...s, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowSmtpPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => toast({ title: "Teste de email enviado!" })}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Testar Configuração
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Notificações ── */}
        <TabsContent value="notifications">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Bell className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notificações</h3>
                <p className="text-xs text-slate-400">Preferências e regras de distribuição</p>
              </div>
            </div>
            <div className="p-5">
              <NotificationPreferencesPanel embedded={true} />
            </div>
          </Card>
        </TabsContent>

        {/* ── Segurança ── */}
        <TabsContent value="security" className="space-y-4">
          <SectionCard icon={Shield} title="Autenticação e Acesso" onSave={() => save("Segurança")}>
            <ToggleRow
              label="Verificação de Email Obrigatória"
              description="Usuários devem verificar email antes de acessar a plataforma"
              checked={security.requireEmailVerification}
              onCheckedChange={v => setSecurity(s => ({ ...s, requireEmailVerification: v }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <Label className="text-xs">Tamanho Máximo de Arquivo (MB)</Label>
                <Input type="number" className="h-9 text-sm"
                  value={security.maxFileSize}
                  onChange={e => setSecurity(s => ({ ...s, maxFileSize: parseInt(e.target.value) || 10 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timeout de Sessão (minutos)</Label>
                <Input type="number" className="h-9 text-sm"
                  value={security.sessionTimeout}
                  onChange={e => setSecurity(s => ({ ...s, sessionTimeout: parseInt(e.target.value) || 30 }))} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Shield} title="Políticas de Senha" onSave={() => save("Políticas de senha")}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-700 dark:text-slate-200">Comprimento mínimo: {security.minLength} caracteres</Label>
                <input type="range" min={6} max={20} value={security.minLength}
                  onChange={e => setSecurity(s => ({ ...s, minLength: parseInt(e.target.value) }))}
                  className="w-24 accent-blue-500" />
              </div>
              <ToggleRow label="Exigir Letras Maiúsculas e Minúsculas"
                checked={security.requireUppercase}
                onCheckedChange={v => setSecurity(s => ({ ...s, requireUppercase: v }))} />
              <ToggleRow label="Exigir Números"
                checked={security.requireNumbers}
                onCheckedChange={v => setSecurity(s => ({ ...s, requireNumbers: v }))} />
              <ToggleRow label="Exigir Caracteres Especiais"
                checked={security.requireSpecial}
                onCheckedChange={v => setSecurity(s => ({ ...s, requireSpecial: v }))} />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Aparência ── */}
        <TabsContent value="appearance" className="space-y-4">
          <SectionCard icon={Palette} title="Cores da Plataforma" onSave={() => save("Aparência")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { key: "primaryColor",   label: "Cor Primária" },
                { key: "secondaryColor", label: "Cor Secundária" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={appearance[key]}
                      onChange={e => setAppearance(a => ({ ...a, [key]: e.target.value }))}
                      className="h-10 w-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5" />
                    <Input className="h-9 text-sm font-mono" value={appearance[key]}
                      onChange={e => setAppearance(a => ({ ...a, [key]: e.target.value }))} />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => { setAppearance({ primaryColor: "#3B82F6", secondaryColor: "#10B981" }); toast({ title: "Cores restauradas para o padrão" }); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
              </Button>
            </div>
          </SectionCard>

          <SectionCard icon={Palette} title="Logo da Plataforma">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center gap-3 text-slate-400">
              <Palette className="h-8 w-8 opacity-30" />
              <p className="text-sm">Clique para fazer upload ou arraste uma imagem</p>
              <p className="text-xs">PNG, JPG ou SVG · Máx 2MB</p>
              <Button size="sm" variant="outline" className="h-8 text-xs">Escolher arquivo</Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
