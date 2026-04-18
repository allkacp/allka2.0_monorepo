// @ts-nocheck
import { useState } from "react"
import { Wallet, TrendingUp, Target, Star, Download } from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

// ─── Mock data ────────────────────────────────────────────────────────────────
const NOMADE_NIVEL     = "Silver"
const BONUS_PERCENTAGE = 5

const MONTHLY = [
  { month: "Jul/25", value: 2200, tasks: 5 },
  { month: "Ago/25", value: 2640, tasks: 6 },
  { month: "Set/25", value: 3100, tasks: 7 },
  { month: "Out/25", value: 3520, tasks: 7 },
  { month: "Nov/25", value: 2980, tasks: 6 },
  { month: "Dez/25", value: 3280, tasks: 8 },
  { month: "Jan/26", value: 3850, tasks: 8 },
]

const PAYMENTS = [
  { id: 1,  task: "Criação de Landing Page",    client: "Empresa XYZ",  date: "12/01/2026", value: 620,  bonus: 31,   status: "pago" },
  { id: 2,  task: "Design de Apresentação",      client: "StartupABC",   date: "15/01/2026", value: 380,  bonus: 19,   status: "pago" },
  { id: 3,  task: "Redação de Blog Post",        client: "Agência Sol",  date: "17/01/2026", value: 250,  bonus: 12.5, status: "pago" },
  { id: 4,  task: "Campanha de Email Marketing", client: "Brand Co.",    date: "20/01/2026", value: 480,  bonus: 24,   status: "pendente" },
  { id: 5,  task: "UX Review Mobile App",        client: "AppTech",      date: "22/01/2026", value: 720,  bonus: 36,   status: "pendente" },
  { id: 6,  task: "Vídeo Institucional",         client: "Const. JM",    date: "08/01/2026", value: 900,  bonus: 45,   status: "pago" },
  { id: 7,  task: "Post para Redes Sociais",     client: "Café Aroma",   date: "03/01/2026", value: 180,  bonus: 9,    status: "pago" },
  { id: 8,  task: "Artigo SEO",                  client: "Agência Sol",  date: "28/12/2025", value: 320,  bonus: 16,   status: "pago" },
  { id: 9,  task: "Identidade Visual",           client: "Núcleo Saúde", date: "20/12/2025", value: 1100, bonus: 55,   status: "pago" },
  { id: 10, task: "Script de Apresentação",      client: "Brand Co.",    date: "12/12/2025", value: 280,  bonus: 14,   status: "pago" },
]

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pago:     { label: "Pago",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-600 border-amber-200" },
}

const LEVEL_BONUSES = [
  { name: "Bronze",   pct: 0,  current: false },
  { name: "Silver",   pct: 5,  current: true  },
  { name: "Gold",     pct: 10, current: false },
  { name: "Platinum", pct: 15, current: false },
  { name: "Diamond",  pct: 20, current: false },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NomadesGanhosPage() {
  const paid        = PAYMENTS.filter((p) => p.status === "pago")
  const totalEarned = paid.reduce((s, p) => s + p.value + p.bonus, 0)
  const monthPaid   = paid.filter((p) => p.date.includes("/01/2026"))
  const monthEarned = monthPaid.reduce((s, p) => s + p.value + p.bonus, 0)
  const totalBonus  = paid.reduce((s, p) => s + p.bonus, 0)
  const avgPerTask  = paid.length ? Math.round(totalEarned / paid.length) : 0
  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting()
  const sortedPayments = sortData(PAYMENTS)

  const maxBar = Math.max(...MONTHLY.map((m) => m.value), 1)

  // Potential gain if Gold (+10%)
  const extraIfGold = totalEarned * 0.05

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ganhos"
        subtitle="Histórico completo de pagamentos e bônus de nível"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-linear-to-br from-violet-600 to-violet-700 p-4 text-white shadow-sm">
          <Wallet className="h-5 w-5 text-white/60 mb-2" />
          <p className="text-2xl font-bold">{fmtBRL(totalEarned)}</p>
          <p className="text-xs text-white/60 mt-0.5">Total ganho</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(monthEarned)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Este mês</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <Target className="h-5 w-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(avgPerTask)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Média por tarefa</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <Star className="h-5 w-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(totalBonus)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Bônus {NOMADE_NIVEL} (+{BONUS_PERCENTAGE}%)</p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ganhos Mensais</h3>
          <span className="text-xs text-slate-400">Últimos 7 meses</span>
        </div>
        <div className="flex items-end gap-2 h-28">
          {MONTHLY.map((m) => {
            const pct       = (m.value / maxBar) * 100
            const isCurrent = m.month === "Jan/26"
            return (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block truncate w-full text-center">
                  {fmtBRL(m.value).replace("R$\u00a0", "R$")}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${isCurrent ? "bg-violet-500" : "bg-slate-200 dark:bg-slate-700"}`}
                  style={{ height: `${Math.max(pct, 8)}%`, minHeight: 6 }}
                />
                <span className="text-[10px] text-slate-400 truncate w-full text-center">{m.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Level bonus panel */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Bônus por Nível</h3>
          <div className="space-y-2">
            {LEVEL_BONUSES.map((l) => (
              <div
                key={l.name}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  l.current
                    ? "bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold text-slate-800 dark:text-slate-100"
                    : "text-slate-400"
                }`}
              >
                <span>{l.name}</span>
                <span>{l.pct === 0 ? "Base" : `+${l.pct}%`}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            No Gold (+10%) você ganharia {fmtBRL(extraIfGold)} a mais no mesmo período histórico.
          </p>
        </div>

        {/* Payments table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Histórico de Pagamentos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-2.5 text-left font-medium">
                    <SortableHeader label="Tarefa" field="task" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    <SortableHeader label="Data" field="date" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    <SortableHeader label="Valor" field="value" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    <SortableHeader label="Bônus" field="bonus" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-2.5 text-center font-medium">
                    <SortableHeader label="Status" field="status" type="status" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={[...new Set(PAYMENTS.map((p) => p.status).filter(Boolean))]} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedPayments.map((p) => {
                  const s = STATUS_CFG[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-40">{p.task}</p>
                        <p className="text-xs text-slate-400">{p.client}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{p.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {fmtBRL(p.value)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium text-xs whitespace-nowrap">
                        +{fmtBRL(p.bonus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
