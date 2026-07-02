// @ts-nocheck
import { useState } from "react"
import {
  CheckCircle2, XCircle, Star, Wallet, TrendingUp, Calendar,
  Filter, Download, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PageHeader } from "@/components/page-header"
import { useItemsPerPage } from "@/lib/use-items-per-page"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type HistItem = {
  id: number; title: string; client: string; category: string
  value: number; bonus: number; finalValue: number
  completedAt: string; rating: number; feedback?: string
  level: string; daysToDeliver: number; onTime: boolean
}

const HISTORY: HistItem[] = [
  { id: 1,  title: "Posts Instagram — 15 artes",     client: "Loja Moda",       category: "Design",         value: 390,  bonus: 19.5,  finalValue: 409.5, completedAt: "07/04/2026", rating: 5,   feedback: "Excelente trabalho! As artes superaram nossas expectativas. Vamos fechar novamente.", level: "Silver", daysToDeliver: 4,  onTime: true },
  { id: 2,  title: "Infográfico — Relatório Anual",  client: "ONG Educação",    category: "Design",         value: 540,  bonus: 27,    finalValue: 567,   completedAt: "04/04/2026", rating: 4,   feedback: "Muito bom! Alguns ajustes finais feitos diretamente, mas qualidade ótima.", level: "Silver", daysToDeliver: 3,  onTime: true },
  { id: 3,  title: "Planilha de Precificação",       client: "Consultoria RH",  category: "Gestão",         value: 380,  bonus: 19,    finalValue: 399,   completedAt: "28/03/2026", rating: 5,   feedback: "Muito organizada, fácil de usar. Adorei as tabelas dinâmicas.", level: "Silver", daysToDeliver: 2,  onTime: true },
  { id: 4,  title: "Campanha de Email Marketing",    client: "Brand Co.",       category: "Marketing",      value: 480,  bonus: 24,    finalValue: 504,   completedAt: "22/03/2026", rating: 4,   level: "Silver", daysToDeliver: 6, onTime: true },
  { id: 5,  title: "Redação de 3 artigos SEO",       client: "Blog Tech",       category: "Conteúdo",       value: 360,  bonus: 18,    finalValue: 378,   completedAt: "15/03/2026", rating: 5,   feedback: "Excelentes artigos, totalmente alinhados com a nossa estratégia.", level: "Silver", daysToDeliver: 5, onTime: true },
  { id: 6,  title: "Gestão Redes Sociais — fev",     client: "Café Aroma",      category: "Marketing",      value: 580,  bonus: 29,    finalValue: 609,   completedAt: "28/02/2026", rating: 3,   feedback: "Trabalho ok, mas alguns posts estavam fora do padrão esperado.", level: "Silver", daysToDeliver: 28, onTime: true },
  { id: 7,  title: "Reels — 6 vídeos",               client: "Academia FIT",    category: "Design",         value: 420,  bonus: 21,    finalValue: 441,   completedAt: "20/02/2026", rating: 5,   feedback: "Incrível! Os Reels viralizaram. Contrato renovado.", level: "Bronze", daysToDeliver: 5, onTime: true },
  { id: 8,  title: "Script Podcast — 2 episódios",   client: "Rádio Digital",   category: "Conteúdo",       value: 320,  bonus: 0,     finalValue: 320,   completedAt: "12/02/2026", rating: 4,   level: "Bronze", daysToDeliver: 4, onTime: false },
  { id: 9,  title: "Proposta Comercial (template)",  client: "Agência 360",     category: "Design",         value: 450,  bonus: 0,     finalValue: 450,   completedAt: "05/02/2026", rating: 4,   feedback: "Muito boa a apresentação, ficou profissional.", level: "Bronze", daysToDeliver: 5, onTime: true },
  { id: 10, title: "Newsletter jan/fev",              client: "Startup SaaS",   category: "Conteúdo",       value: 280,  bonus: 0,     finalValue: 280,   completedAt: "31/01/2026", rating: 5,   feedback: "Newsletters lindas, abertura subiu 40%!", level: "Bronze", daysToDeliver: 30, onTime: true },
  { id: 11, title: "Landing Page — Produto B",       client: "TechVentures",    category: "Desenvolvimento", value: 820, bonus: 0,     finalValue: 820,   completedAt: "20/01/2026", rating: 4,   level: "Bronze", daysToDeliver: 7, onTime: true },
  { id: 12, title: "Identidade Visual básica",       client: "Padaria Nova",    category: "Design",         value: 950,  bonus: 0,     finalValue: 950,   completedAt: "10/01/2026", rating: 3,   feedback: "Entrega no prazo, mas esperávamos mais opções.", level: "Bronze", daysToDeliver: 10, onTime: true },
]

const MONTHS = ["Todos", "Abril/26", "Março/26", "Fevereiro/26", "Janeiro/26"]

const MONTH_MAP: Record<string, string[]> = {
  "Abril/26":     ["07/04/2026", "04/04/2026"],
  "Março/26":     ["28/03/2026", "22/03/2026", "15/03/2026"],
  "Fevereiro/26": ["28/02/2026", "20/02/2026", "12/02/2026", "05/02/2026"],
  "Janeiro/26":   ["31/01/2026", "20/01/2026", "10/01/2026"],
}

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

export default function NomadesHistoricoPage() {
  const [month, setMonth]   = useState("Todos")
  const [detail, setDetail] = useState<HistItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("nomades-historico", 10)
  const { sortKey, sortDir, handleSort, sortData } = useSorting<HistItem>()

  const filtered = month === "Todos"
    ? HISTORY
    : HISTORY.filter((h) => (MONTH_MAP[month] ?? []).includes(h.completedAt))

  const sorted = sortData(filtered)
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedHistory = sorted.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)

  const totalEarned  = filtered.reduce((s, h) => s + h.finalValue, 0)
  const totalBonus   = filtered.reduce((s, h) => s + h.bonus, 0)
  const avgRating    = filtered.length ? (filtered.reduce((s, h) => s + h.rating, 0) / filtered.length).toFixed(1) : "-"
  const onTimePct    = filtered.length ? Math.round((filtered.filter((h) => h.onTime).length / filtered.length) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        subtitle="Todas as tarefas concluídas e seus resultados"
        actions={
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Download className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Exportar
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Exportar histórico</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-linear-to-br from-violet-600 to-violet-700 p-4 text-white shadow-sm">
          <Wallet className="h-4 w-4 text-white/60 mb-1.5" />
          <p className="text-xl font-bold">{fmtBRL(totalEarned)}</p>
          <p className="text-xs text-white/60 mt-0.5">Total no período</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <TrendingUp className="h-4 w-4 text-emerald-500 mb-1.5" />
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{filtered.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Tarefas concluídas</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <Star className="h-4 w-4 text-amber-500 mb-1.5" />
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{avgRating} ★</p>
          <p className="text-xs text-slate-400 mt-0.5">Avaliação média</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-blue-500 mb-1.5" />
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{onTimePct}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Entregues no prazo</p>
        </div>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        {MONTHS.map((m) => (
          <button
            key={m}
            onClick={() => { setMonth(m); setCurrentPage(1) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              month === m
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            {m}
          </button>
        ))}
        <div className="ml-auto shrink-0">
          <ItemsPerPageSelect
            value={itemsPerPage.toString()}
            onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}
            variant="top"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto allka-table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left font-medium">
                  <SortableHeader label="Tarefa" field="title" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                  <SortableHeader label="Concluída em" field="completedAt" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                  <SortableHeader label="Valor" field="value" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                  <SortableHeader label="Bônus" field="bonus" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <SortableHeader label="Avaliação" field="rating" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-center font-medium">Prazo</th>
                <th className="px-4 py-3 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedHistory.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-44">{h.title}</p>
                    <p className="text-xs text-slate-400">{h.client}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{h.completedAt}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {fmtBRL(h.value)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {h.bonus > 0
                      ? <span className="text-emerald-600 font-medium text-xs">+{fmtBRL(h.bonus)}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-xs font-semibold text-amber-600">{h.rating}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {h.onTime
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {h.feedback && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-slate-600"
                        onClick={() => setDetail(h)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <p className="text-sm">Nenhuma tarefa neste período</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-sm text-slate-500">Página {safeCurrentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetTitle className="text-base font-bold pr-6">{detail.title}</SheetTitle>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">{detail.client} · {detail.completedAt}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Total recebido</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(detail.finalValue)}</p>
                    {detail.bonus > 0 && (
                      <p className="text-xs text-emerald-600">(inclui +{fmtBRL(detail.bonus)} bônus)</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Avaliação</p>
                    <StarRating value={detail.rating} />
                    <p className="text-xs text-slate-400 mt-1">{detail.rating}/5</p>
                  </div>
                </div>

                {detail.feedback && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">Feedback do cliente</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                      "{detail.feedback}"
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  {detail.onTime
                    ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-slate-600 dark:text-slate-300">Entregue no prazo ({detail.daysToDeliver} dias)</span></>
                    : <><XCircle className="h-4 w-4 text-red-400" /><span className="text-slate-600 dark:text-slate-300">Entregue com atraso</span></>
                  }
                </div>

                <Button variant="outline" className="w-full" onClick={() => setDetail(null)}>Fechar</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
