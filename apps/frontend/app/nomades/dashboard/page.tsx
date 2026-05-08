// @ts-nocheck
import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Target, CheckSquare, Star, Wallet, ArrowUpRight,
  ChevronRight, Clock, Award,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

const NOMADE = {
  name: "Ana Lima",
  nivel: "Silver",
  nivelIcon: "🥈",
  bonusPercentage: 5,
  tasksThisQuarter: 35,
  tasksGoal: 50,
  rating: 4.3,
  ratingGoal: 4.5,
  onTime: 86,
  onTimeGoal: 90,
  earningsMonth: 3850,
  tasksMonth: 8,
  availableTasks: 18,
  myActiveTasks: 6,
  nextNivel: "Gold",
}

const NIVEL_BADGE: Record<string, string> = {
  Bronze:   "bg-amber-100 text-amber-700 border-amber-200",
  Silver:   "bg-slate-100 text-slate-600 border-slate-300",
  Gold:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  Platinum: "bg-sky-100 text-sky-700 border-sky-200",
  Diamond:  "bg-violet-100 text-violet-700 border-violet-200",
  Leader:   "bg-rose-100 text-rose-700 border-rose-200",
}

const RECENT_TASKS = [
  { id: 1, name: "Criação de Landing Page",  client: "Empresa XYZ", value: 620,  status: "Entregue",     date: "12/01/2026" },
  { id: 2, name: "Design de Apresentação",   client: "StartupABC",  value: 380,  status: "Em execução",  date: "14/01/2026" },
  { id: 3, name: "Redação de Blog Post",     client: "Agência Sol", value: 250,  status: "Em revisão",   date: "15/01/2026" },
]

const TASK_STATUS_CLS: Record<string, string> = {
  "Entregue":     "bg-emerald-100 text-emerald-700",
  "Em execução":  "bg-blue-100 text-blue-700",
  "Em revisão":   "bg-amber-100 text-amber-700",
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function NomadesDashboard() {
  const progressTasks  = Math.round((NOMADE.tasksThisQuarter / NOMADE.tasksGoal) * 100)
  const progressRating = Math.min(100, Math.round((NOMADE.rating / NOMADE.ratingGoal) * 100))
  const progressOnTime = Math.min(100, Math.round((NOMADE.onTime / NOMADE.onTimeGoal) * 100))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${NOMADE.name.split(" ")[0]} 👋`}
        subtitle="Aqui está um resumo da sua jornada nômade"
      />

      {/* Level hero card */}
      <div className="rounded-2xl bg-linear-to-r from-slate-800 to-slate-700 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/60 mb-1">Seu nível atual</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{NOMADE.nivelIcon}</span>
              <div>
                <span className="text-2xl font-bold">{NOMADE.nivel}</span>
                <p className="text-xs text-white/60 mt-0.5">+{NOMADE.bonusPercentage}% de bônus nas tarefas</p>
              </div>
            </div>
            <p className="text-sm text-white/70 mt-2">
              {NOMADE.tasksThisQuarter} / {NOMADE.tasksGoal} tarefas este trimestre
            </p>
          </div>
          <Link to="/nomades/programa">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 shrink-0"
            >
              Saiba mais <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-white/60">
            <span>Progresso para {NOMADE.nextNivel}</span>
            <span>{progressTasks}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progressTasks}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 font-medium">Tarefas disponíveis</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{NOMADE.availableTasks}</p>
            <Link
              to="/nomades/tarefasdisponiveis"
              className="text-xs text-blue-600 flex items-center gap-0.5 mt-1 hover:underline"
            >
              Ver tarefas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Minhas tarefas</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{NOMADE.myActiveTasks}</p>
            <Link
              to="/nomades/minhastarefas"
              className="text-xs text-blue-600 flex items-center gap-0.5 mt-1 hover:underline"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">Avaliação</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{NOMADE.rating.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">Meta: {NOMADE.ratingGoal.toFixed(1)} para {NOMADE.nextNivel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-slate-500 font-medium">Ganhos este mês</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(NOMADE.earningsMonth)}</p>
            <Link
              to="/nomades/ganhos"
              className="text-xs text-blue-600 flex items-center gap-0.5 mt-1 hover:underline"
            >
              Ver ganhos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Level progress detail */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Progresso para {NOMADE.nextNivel}
              </h3>
              <Link
                to="/nomades/programa"
                className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
              >
                Ver programa <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" /> Tarefas no trimestre
                  </span>
                  <span className="font-medium text-slate-700">{NOMADE.tasksThisQuarter} / {NOMADE.tasksGoal}</span>
                </div>
                <Progress value={progressTasks} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" /> Avaliação média
                  </span>
                  <span className="font-medium text-slate-700">{NOMADE.rating.toFixed(1)} / {NOMADE.ratingGoal.toFixed(1)} ★</span>
                </div>
                <Progress value={progressRating} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Entrega no prazo
                  </span>
                  <span className="font-medium text-slate-700">{NOMADE.onTime}% / {NOMADE.onTimeGoal}%</span>
                </div>
                <Progress value={progressOnTime} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent tasks */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tarefas Recentes
              </h3>
              <Link
                to="/nomades/minhastarefas"
                className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
              >
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {RECENT_TASKS.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.client} · {t.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_CLS[t.status]}`}>
                      {t.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {fmtBRL(t.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/nomades/habilitacoes"
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Award className="h-3.5 w-3.5" />
                Ver minhas habilitações
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
