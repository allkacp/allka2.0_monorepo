// @ts-nocheck
import { useState } from "react"
import {
  User, Mail, Phone, MapPin, Globe, Star, Edit2, Check,
  Camera, Award, Clock, Target, Wallet, Shield, RefreshCw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

const NIVEL_BADGE: Record<string, string> = {
  Bronze:   "bg-amber-100 text-amber-700 border-amber-200",
  Silver:   "bg-slate-100 text-slate-600 border-slate-300",
  Gold:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  Platinum: "bg-sky-100 text-sky-700 border-sky-200",
  Diamond:  "bg-violet-100 text-violet-700 border-violet-200",
  Leader:   "bg-rose-100 text-rose-700 border-rose-200",
}

const SKILLS_OPTIONS = [
  "Design Gráfico", "Illustrator", "Photoshop", "Figma", "Canva",
  "Redação", "Copywriting", "SEO", "Marketing Digital",
  "HTML/CSS", "JavaScript", "React", "WordPress",
  "Edição de Vídeo", "Premiere", "After Effects", "CapCut",
  "Social Media", "Excel", "Power BI", "Google Ads", "Meta Ads",
]

const INITIAL = {
  name: "Ana Lima",
  email: "ana.lima@email.com",
  phone: "(11) 99876-5432",
  city: "São Paulo",
  state: "SP",
  bio: "Profissional criativa com experiência em design gráfico, redes sociais e conteúdo digital. Trabalho remotamente há 3 anos entregando projetos de alta qualidade para clientes de diversos segmentos.",
  nivel: "Silver",
  nivelIcon: "🥈",
  rating: 4.3,
  totalTasks: 47,
  memberSince: "Junho/2024",
  availability: true,
  minTaskValue: 250,
  maxHoursWeek: 20,
  portfolio: "https://portfolio.analima.com",
  linkedin: "",
  skills: ["Design Gráfico", "Figma", "Canva", "Social Media", "Redação", "SEO"],
  notifications: {
    newTasks: true,
    taskStatus: true,
    payments: true,
    levelChanges: true,
    newsletter: false,
  },
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export default function NomadesPerfilPage() {
  const [form, setForm]           = useState({ ...INITIAL })
  const [editMode, setEditMode]   = useState(false)
  const [saved, setSaved]         = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const setField = (key: string, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const setNotif = (key: string, val: boolean) =>
    setForm((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: val } }))

  const toggleSkill = (skill: string) => {
    const has = form.skills.includes(skill)
    setField("skills", has ? form.skills.filter((s) => s !== skill) : [...form.skills, skill])
  }

  const handleSave = () => {
    setEditMode(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCancel = () => {
    setForm({ ...INITIAL })
    setEditMode(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        subtitle="Gerencie suas informações, habilidades e preferências"
        actions={
          editMode ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>Cancelar</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditMode(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Editar perfil
            </Button>
          )
        }
      />

      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
          <Check className="h-4 w-4" /> Perfil atualizado com sucesso!
        </div>
      )}

      {/* Profile header card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {form.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            {editMode && (
              <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50">
                <Camera className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{form.name}</h2>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${NIVEL_BADGE[form.nivel]}`}>
                {form.nivelIcon} {form.nivel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{form.city}, {form.state}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Membro desde {form.memberSince}</span>
            </div>
            <StarRating value={form.rating} />
          </div>

          {/* Stats */}
          <div className="flex sm:flex-col gap-4 sm:gap-3 sm:items-end shrink-0">
            <div className="text-center sm:text-right">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{form.totalTasks}</p>
              <p className="text-xs text-slate-400">tarefas concluídas</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${form.availability ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="text-xs text-slate-500">{form.availability ? "Disponível" : "Indisponível"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
          <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>

        {/* ─── Dados pessoais ─────────────────────────────────────────── */}
        <TabsContent value="dados" className="mt-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Nome completo</Label>
                {editMode
                  ? <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                  : <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{form.name}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Email</Label>
                {editMode
                  ? <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  : <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{form.email}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Telefone</Label>
                {editMode
                  ? <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  : <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{form.phone}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Localização</Label>
                {editMode
                  ? (
                    <div className="flex gap-2">
                      <Input placeholder="Cidade" value={form.city} onChange={(e) => setField("city", e.target.value)} />
                      <Input placeholder="UF" value={form.state} onChange={(e) => setField("state", e.target.value)} className="w-20" />
                    </div>
                  )
                  : <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{form.city}, {form.state}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Portfólio</Label>
                {editMode
                  ? <Input placeholder="https://" value={form.portfolio} onChange={(e) => setField("portfolio", e.target.value)} />
                  : <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate"><Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />{form.portfolio || "—"}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">LinkedIn</Label>
                {editMode
                  ? <Input placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e) => setField("linkedin", e.target.value)} />
                  : <p className="text-sm text-slate-700 dark:text-slate-200">{form.linkedin || "—"}</p>
                }
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Bio profissional</Label>
              {editMode
                ? <Textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} rows={3} className="resize-none" />
                : <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{form.bio}</p>
              }
            </div>
          </div>
        </TabsContent>

        {/* ─── Habilidades ──────────────────────────────────────────────── */}
        <TabsContent value="habilidades" className="mt-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Selecione suas habilidades para ser encontrado pelas tarefas certas.
            </p>
            <div className="flex flex-wrap gap-2">
              {SKILLS_OPTIONS.map((skill) => {
                const selected = form.skills.includes(skill)
                return (
                  <button
                    key={skill}
                    onClick={() => editMode && toggleSkill(skill)}
                    disabled={!editMode}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      selected
                        ? "bg-blue-600 text-white border-blue-600"
                        : editMode
                          ? "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-400">{form.skills.length} habilidades selecionadas</p>
          </div>
        </TabsContent>

        {/* ─── Preferências ────────────────────────────────────────────── */}
        <TabsContent value="preferencias" className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Disponibilidade e limites</h3>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-200">Disponível para tarefas</p>
                <p className="text-xs text-slate-400 mt-0.5">Receber sugestões de novas tarefas</p>
              </div>
              <Switch checked={form.availability} onCheckedChange={(v) => editMode && setField("availability", v)} disabled={!editMode} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Valor mínimo por tarefa</Label>
                {editMode
                  ? <Input type="number" value={form.minTaskValue} onChange={(e) => setField("minTaskValue", Number(e.target.value))} />
                  : <p className="text-sm font-medium text-slate-700 dark:text-slate-200">R$\u00a0{form.minTaskValue}</p>
                }
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Máximo de horas por semana</Label>
                {editMode
                  ? <Input type="number" value={form.maxHoursWeek} onChange={(e) => setField("maxHoursWeek", Number(e.target.value))} />
                  : <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.maxHoursWeek}h / semana</p>
                }
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notificações</h3>
            {[
              { key: "newTasks",     label: "Novas tarefas disponíveis",      desc: "Quando surgir tarefa compatível com seu perfil" },
              { key: "taskStatus",   label: "Atualizações de tarefa",          desc: "Revisões, aprovações e comentários" },
              { key: "payments",     label: "Pagamentos e bônus",              desc: "Confirmação de pagamento processado" },
              { key: "levelChanges", label: "Mudanças de nível",               desc: "Promoções e avisos de rebaixamento" },
              { key: "newsletter",   label: "Newsletter da plataforma",        desc: "Novidades, dicas e atualizações gerais" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <Switch
                  checked={form.notifications[key]}
                  onCheckedChange={(v) => setNotif(key, v)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Segurança ───────────────────────────────────────────────── */}
        <TabsContent value="seguranca" className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Alterar senha</h3>
            <div className="space-y-3 max-w-sm">
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Senha atual</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Nova senha</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Confirmar nova senha</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Atualizar senha
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-5">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Zona de risco</h3>
            <p className="text-xs text-red-500 dark:text-red-400 mb-3">
              A exclusão de conta é permanente e remove todos os dados associados.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setConfirmReset(true)}
            >
              Solicitar exclusão de conta
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Solicitar exclusão de conta"
        description="Ao confirmar, sua solicitação será enviada para análise da equipe Allka. Esta ação não pode ser desfeita automaticamente."
        confirmLabel="Sim, solicitar exclusão"
        cancelLabel="Cancelar"
        onConfirm={() => setConfirmReset(false)}
        variant="destructive"
      />
    </div>
  )
}
