// @ts-nocheck
import { useState } from "react"
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, Star, Wallet,
  ChevronDown, MessageSquare, Upload, Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PageHeader } from "@/components/page-header"

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: any }> = {
  em_andamento: { label: "Em andamento", cls: "bg-blue-100 text-blue-700 border-blue-200",    Icon: Clock },
  em_revisao:   { label: "Em revisão",   cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: Eye },
  concluida:    { label: "Concluída",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  cancelada:    { label: "Cancelada",    cls: "bg-red-100 text-red-700 border-red-200",        Icon: XCircle },
  atrasada:     { label: "Atrasada",     cls: "bg-orange-100 text-orange-700 border-orange-200", Icon: AlertTriangle },
}

type MyTask = {
  id: number; title: string; client: string; value: number; bonus: number
  deadline: string; deliveredAt?: string; status: string
  ratingGiven?: number; feedback?: string; progressPct: number
  steps: { name: string; done: boolean }[]
}

const MY_TASKS: MyTask[] = [
  {
    id: 1, title: "Criação de Landing Page",        client: "Empresa XYZ",    value: 620,  bonus: 31,
    deadline: "15/04/2026", status: "em_andamento", progressPct: 60,
    steps: [
      { name: "Wireframe aprovado", done: true },
      { name: "Desenvolvimento HTML/CSS", done: true },
      { name: "Integração JavaScript", done: false },
      { name: "Revisão e entrega", done: false },
    ],
  },
  {
    id: 2, title: "Design de Apresentação",         client: "StartupABC",     value: 380,  bonus: 19,
    deadline: "14/04/2026", status: "em_revisao", progressPct: 90,
    steps: [
      { name: "Brief recebido", done: true },
      { name: "Primeira versão entregue", done: true },
      { name: "Ajustes solicitados", done: true },
      { name: "Aprovação final", done: false },
    ],
  },
  {
    id: 3, title: "Redação de Blog Post",           client: "Agência Sol",    value: 250,  bonus: 12.5,
    deadline: "10/04/2026", status: "atrasada", progressPct: 40,
    steps: [
      { name: "Pauta aprovada", done: true },
      { name: "Rascunho entregue", done: false },
      { name: "Revisão", done: false },
    ],
  },
  {
    id: 4, title: "Identidade Visual — Startup",    client: "AppTech",        value: 1800, bonus: 90,
    deadline: "22/04/2026", status: "em_andamento", progressPct: 25,
    steps: [
      { name: "Briefing inicial", done: true },
      { name: "3 propostas de logo", done: false },
      { name: "Refinamento escolhido", done: false },
      { name: "Manual de marca", done: false },
    ],
  },
  {
    id: 5, title: "Posts Instagram — 15 artes",     client: "Loja Moda",      value: 390,  bonus: 19.5,
    deadline: "08/04/2026", status: "concluida", progressPct: 100,
    deliveredAt: "07/04/2026", ratingGiven: 5,
    feedback: "Excelente trabalho! As artes superaram nossas expectativas. Vamos fechar novamente.",
    steps: [
      { name: "Briefing recebido", done: true },
      { name: "Artes criadas", done: true },
      { name: "Ajustes aplicados", done: true },
      { name: "Entrega aprovada", done: true },
    ],
  },
  {
    id: 6, title: "Infográfico — Relatório Anual",  client: "ONG Educação",   value: 540,  bonus: 27,
    deadline: "05/04/2026", status: "concluida", progressPct: 100,
    deliveredAt: "04/04/2026", ratingGiven: 4,
    feedback: "Muito bom! Alguns ajustes finais feitos diretamente, mas qualidade ótima.",
    steps: [
      { name: "Dados recebidos", done: true },
      { name: "Estrutura aprovada", done: true },
      { name: "Design final", done: true },
      { name: "Entrega em PDF/PNG", done: true },
    ],
  },
]

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  )
}

export default function MinhasTarefasPage() {
  const [tab, setTab]       = useState("ativas")
  const [detail, setDetail] = useState<MyTask | null>(null)

  const active   = MY_TASKS.filter((t) => ["em_andamento", "em_revisao", "atrasada"].includes(t.status))
  const finished = MY_TASKS.filter((t) => ["concluida", "cancelada"].includes(t.status))
  const shown    = tab === "ativas" ? active : finished

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Tarefas"
        subtitle={`${active.length} ativas · ${finished.length} concluídas`}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ativas">
            Ativas <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{active.length}</span>
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{finished.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {shown.map((t) => {
          const cfg  = STATUS_CFG[t.status]
          const Icon = cfg.Icon
          return (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.cls}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.client}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(t.value)}</p>
                    <p className="text-xs text-emerald-600">+{fmtBRL(t.bonus)} bônus</p>
                  </div>
                </div>

                {/* Progress bar for active tasks */}
                {tab === "ativas" && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Progresso</span>
                      <span>{t.progressPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          t.status === "atrasada" ? "bg-orange-400" : "bg-blue-500"
                        }`}
                        style={{ width: `${t.progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rating for completed */}
                {t.ratingGiven && (
                  <div className="mt-3 flex items-center gap-2">
                    <StarRating value={t.ratingGiven} />
                    <span className="text-xs text-slate-400">Avaliado pelo cliente</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-400">
                    {t.deliveredAt ? `Entregue em ${t.deliveredAt}` : `Prazo: ${t.deadline}`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    onClick={() => setDetail(t)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" /> Detalhes
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {shown.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma tarefa nesta aba</p>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent side="right" hideOverlay className="w-full sm:max-w-lg overflow-y-auto">
          {detail && (() => {
            const cfg  = STATUS_CFG[detail.status]
            const Icon = cfg.Icon
            return (
              <>
                <SheetTitle className="text-base font-bold pr-6">{detail.title}</SheetTitle>
                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.cls}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{detail.client}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Valor</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(detail.value)}</p>
                      <p className="text-xs text-emerald-600">+{fmtBRL(detail.bonus)} bônus Silver</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
                        {detail.deliveredAt ? "Entregue em" : "Prazo"}
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {detail.deliveredAt ?? detail.deadline}
                      </p>
                    </div>
                  </div>

                  {/* Steps checklist */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Etapas</p>
                    <div className="space-y-2">
                      {detail.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          {s.done
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : <div className="h-4 w-4 rounded-full border-2 border-slate-200 dark:border-slate-600 shrink-0" />
                          }
                          <span className={`text-sm ${s.done ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback if completed */}
                  {detail.feedback && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Feedback do cliente</p>
                      </div>
                      {detail.ratingGiven && <StarRating value={detail.ratingGiven} />}
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1.5 leading-relaxed">
                        "{detail.feedback}"
                      </p>
                    </div>
                  )}

                  {/* Actions for active tasks */}
                  {["em_andamento", "atrasada"].includes(detail.status) && (
                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDetail(null)}>
                      <Upload className="h-4 w-4" /> Enviar entrega
                    </Button>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => setDetail(null)}>Fechar</Button>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
