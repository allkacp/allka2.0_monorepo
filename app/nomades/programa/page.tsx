// @ts-nocheck
import { useState } from "react"
import {
  CheckCircle2, XCircle, Star, Target, Clock, Award,
  ChevronDown, ChevronUp, Gift, Lock,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"

// ─── Mock nomade current stats ────────────────────────────────────────────────
const NOMADE = {
  nivel: "Silver",
  tasksThisQuarter: 35,
  rating: 4.3,
  onTime: 86,
  rejectionRate: 7,
}

// ─── Level definitions (mirroring admin/niveis-nomades) ──────────────────────
const LEVELS = [
  {
    name: "Bronze",
    icon: "🥉",
    min_tasks_quarter: 0,
    min_rating: 0,
    max_rejection_rate: 100,
    min_ontime_rate: 0,
    bonus_percentage: 0,
    level_up_bonus_credits: 0,
    is_invite: false,
    bg: "from-amber-50 to-orange-50/60",
    borderCls: "border-amber-200",
    activeBorderCls: "border-l-4 border-l-amber-500 border-amber-200",
    barCls: "bg-amber-400",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    benefits: [
      "Acesso a tarefas do catálogo básico",
      "Badge Bronze no perfil",
      "Suporte por email",
    ],
  },
  {
    name: "Silver",
    icon: "🥈",
    min_tasks_quarter: 20,
    min_rating: 4.0,
    max_rejection_rate: 20,
    min_ontime_rate: 80,
    bonus_percentage: 5,
    level_up_bonus_credits: 100,
    is_invite: false,
    bg: "from-slate-50 to-slate-100/40",
    borderCls: "border-slate-300",
    activeBorderCls: "border-l-4 border-l-slate-500 border-slate-300",
    barCls: "bg-slate-500",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-300",
    benefits: [
      "Acesso a tarefas intermediárias",
      "+5% de bônus nas tarefas",
      "Suporte prioritário",
      "Badge Silver no perfil",
      "R$ 100 em créditos ao atingir nível",
    ],
  },
  {
    name: "Gold",
    icon: "🥇",
    min_tasks_quarter: 50,
    min_rating: 4.5,
    max_rejection_rate: 10,
    min_ontime_rate: 90,
    bonus_percentage: 10,
    level_up_bonus_credits: 250,
    is_invite: false,
    bg: "from-yellow-50 to-amber-50/60",
    borderCls: "border-yellow-200",
    activeBorderCls: "border-l-4 border-l-yellow-500 border-yellow-200",
    barCls: "bg-yellow-500",
    badgeCls: "bg-yellow-100 text-yellow-700 border-yellow-200",
    benefits: [
      "Acesso completo ao catálogo de tarefas",
      "+10% de bônus nas tarefas",
      "Suporte VIP",
      "Badge Gold no perfil",
      "R$ 250 em créditos ao atingir nível",
      "Acesso antecipado a novos projetos",
    ],
  },
  {
    name: "Platinum",
    icon: "💎",
    min_tasks_quarter: 100,
    min_rating: 4.7,
    max_rejection_rate: 5,
    min_ontime_rate: 95,
    bonus_percentage: 15,
    level_up_bonus_credits: 500,
    is_invite: true,
    bg: "from-sky-50 to-blue-50/40",
    borderCls: "border-sky-200",
    activeBorderCls: "border-l-4 border-l-sky-500 border-sky-200",
    barCls: "bg-sky-500",
    badgeCls: "bg-sky-100 text-sky-700 border-sky-200",
    benefits: [
      "Prioridade na distribuição de tarefas premium",
      "+15% de bônus nas tarefas",
      "Suporte dedicado",
      "Badge Platinum no perfil",
      "R$ 500 em créditos ao atingir nível",
      "Convite para eventos da plataforma",
    ],
  },
  {
    name: "Diamond",
    icon: "👑",
    min_tasks_quarter: 200,
    min_rating: 4.9,
    max_rejection_rate: 2,
    min_ontime_rate: 98,
    bonus_percentage: 20,
    level_up_bonus_credits: 1000,
    is_invite: true,
    bg: "from-violet-50 to-purple-50/40",
    borderCls: "border-violet-200",
    activeBorderCls: "border-l-4 border-l-violet-500 border-violet-200",
    barCls: "bg-violet-500",
    badgeCls: "bg-violet-100 text-violet-700 border-violet-200",
    benefits: [
      "Prioridade máxima em tarefas de alto valor",
      "+20% de bônus nas tarefas",
      "Gerente de conta dedicado",
      "Badge Diamond no perfil",
      "R$ 1.000 em créditos ao atingir nível",
      "Participação em votações de melhorias da plataforma",
    ],
  },
  {
    name: "Leader",
    icon: "🔥",
    min_tasks_quarter: 50,
    min_rating: 4.7,
    max_rejection_rate: 5,
    min_ontime_rate: 95,
    bonus_percentage: 15,
    level_up_bonus_credits: 500,
    is_invite: true,
    bg: "from-rose-50 to-pink-50/40",
    borderCls: "border-rose-200",
    activeBorderCls: "border-l-4 border-l-rose-500 border-rose-200",
    barCls: "bg-rose-500",
    badgeCls: "bg-rose-100 text-rose-700 border-rose-200",
    benefits: [
      "Comissão sobre tarefas dos nômades liderados",
      "+15% de bônus nas próprias tarefas",
      "Painel de gestão de equipe",
      "Badge Leader no perfil",
      "R$ 500 em créditos ao assumir liderança",
      "Acesso antecipado a novos produtos",
      "Participação em rituais estratégicos com fundadores",
    ],
  },
]

const LEVEL_ORDER = LEVELS.map((l) => l.name)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCriteriaStatus(level: typeof LEVELS[number]) {
  const tasks     = NOMADE.tasksThisQuarter >= level.min_tasks_quarter
  const rating    = NOMADE.rating           >= level.min_rating
  const ontime    = NOMADE.onTime           >= level.min_ontime_rate
  const rejection = NOMADE.rejectionRate    <= level.max_rejection_rate
  return { tasks, rating, ontime, rejection, all: tasks && rating && ontime && rejection }
}

// ─── CriteriaItem sub-component ──────────────────────────────────────────────
function CriteriaItem({
  label, current, target, unit, met, barCls, precision = 0, isMax = false,
}: {
  label: string; current: number; target: number; unit: string
  met: boolean; barCls: string; precision?: number; isMax?: boolean
}) {
  const pct = isMax
    ? met ? 100 : Math.max(0, Math.round(((target - current) / target) * 100))
    : Math.min(100, Math.round((current / Math.max(target, 0.01)) * 100))

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        {met
          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          : <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
        }
      </div>
      <div className="flex items-end gap-1">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {current.toFixed(precision)}{unit === "%" ? "%" : unit === "★" ? "★" : ""}
        </span>
        <span className="text-xs text-slate-400 mb-0.5">
          {isMax ? "máx " : "/ "}
          {target.toFixed(precision)}{unit === "%" ? "%" : unit === "★" ? "★" : unit === "tarefas" ? " tarefas" : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NomadesProgramaPage() {
  const currentIndex = LEVEL_ORDER.indexOf(NOMADE.nivel)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([NOMADE.nivel, LEVEL_ORDER[currentIndex + 1] ?? ""])
  )

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const s = new Set(prev)
      s.has(name) ? s.delete(name) : s.add(name)
      return s
    })
  }

  const currentLevel = LEVELS.find((l) => l.name === NOMADE.nivel)!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programa Nômade"
        subtitle="Acompanhe sua evolução e descubra os benefícios de cada nível"
      />

      {/* Hero banner */}
      <div className="rounded-2xl bg-linear-to-br from-slate-800 via-slate-700 to-slate-600 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-white/60 mb-1">Seu nível atual</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{currentLevel.icon}</span>
              <div>
                <p className="text-2xl font-bold">{currentLevel.name}</p>
                <p className="text-sm text-white/60">
                  {currentLevel.bonus_percentage > 0
                    ? `+${currentLevel.bonus_percentage}% de bônus nas tarefas`
                    : "Nível base — sem bônus ainda"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{NOMADE.tasksThisQuarter}</p>
              <p className="text-xs text-white/50">tarefas / trim.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{NOMADE.rating.toFixed(1)}</p>
              <p className="text-xs text-white/50">avaliação</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{NOMADE.onTime}%</p>
              <p className="text-xs text-white/50">no prazo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Level journey */}
      <div className="space-y-3">
        {LEVELS.map((level, idx) => {
          const isCurrent  = level.name === NOMADE.nivel
          const isAchieved = idx < currentIndex
          const isNext     = idx === currentIndex + 1
          const isExpanded = expanded.has(level.name)
          const status     = getCriteriaStatus(level)

          return (
            <div
              key={level.name}
              className={`rounded-xl border overflow-hidden transition-shadow ${
                isCurrent
                  ? `${level.activeBorderCls} shadow-md`
                  : `${level.borderCls} ${idx > currentIndex + 1 ? "opacity-80" : ""}`
              }`}
            >
              {/* Accordion header */}
              <button
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 bg-linear-to-r ${level.bg} text-left`}
                onClick={() => toggle(level.name)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{level.icon}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{level.name}</span>
                      {isCurrent && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                          Nível atual
                        </span>
                      )}
                      {isAchieved && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                          ✓ Atingido
                        </span>
                      )}
                      {level.is_invite && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Por convite
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {level.bonus_percentage > 0 ? `+${level.bonus_percentage}% bônus` : "Nível base"}
                      {level.level_up_bonus_credits > 0 && ` · R$\u00a0${level.level_up_bonus_credits} ao atingir`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isNext && status.all && !level.is_invite && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Elegível ✓
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 space-y-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {/* Invite notice */}
                  {level.is_invite && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <Lock className="h-4 w-4 text-purple-500 shrink-0" />
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Este nível é por convite da equipe Allka. Continue se destacando para ser notado!
                      </p>
                    </div>
                  )}

                  {/* Criteria (only for non-invite, non-entry levels) */}
                  {!level.is_invite && level.min_tasks_quarter > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Critérios para atingir
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <CriteriaItem
                          label="Tarefas no trimestre"
                          current={NOMADE.tasksThisQuarter}
                          target={level.min_tasks_quarter}
                          unit="tarefas"
                          met={NOMADE.tasksThisQuarter >= level.min_tasks_quarter}
                          barCls={level.barCls}
                        />
                        <CriteriaItem
                          label="Avaliação mínima"
                          current={NOMADE.rating}
                          target={level.min_rating}
                          unit="★"
                          met={NOMADE.rating >= level.min_rating}
                          barCls={level.barCls}
                          precision={1}
                        />
                        <CriteriaItem
                          label="Entrega no prazo"
                          current={NOMADE.onTime}
                          target={level.min_ontime_rate}
                          unit="%"
                          met={NOMADE.onTime >= level.min_ontime_rate}
                          barCls={level.barCls}
                        />
                        <CriteriaItem
                          label="Taxa de rejeição máx."
                          current={NOMADE.rejectionRate}
                          target={level.max_rejection_rate}
                          unit="%"
                          met={NOMADE.rejectionRate <= level.max_rejection_rate}
                          barCls={level.barCls}
                          isMax
                        />
                      </div>
                    </div>
                  )}

                  {/* Bronze: just a note */}
                  {level.name === "Bronze" && (
                    <p className="text-sm text-slate-500">
                      Nível inicial concedido a todo nômade aprovado na plataforma. Não há critérios de manutenção.
                    </p>
                  )}

                  {/* Benefits */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Benefícios
                    </p>
                    <ul className="space-y-1.5">
                      {level.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <CheckCircle2
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isAchieved || isCurrent ? "text-emerald-500" : "text-slate-300"
                            }`}
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Level-up bonus callout */}
                  {level.level_up_bonus_credits > 0 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                      <Gift className="h-4 w-4 shrink-0 text-amber-500" />
                      <span>
                        Bônus de chegada: <strong>R$\u00a0{level.level_up_bonus_credits} em créditos</strong> ao atingir este nível
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
