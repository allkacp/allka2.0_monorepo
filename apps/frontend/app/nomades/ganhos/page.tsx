import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Target,
  TrendingUp,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import { useItemsPerPage } from "@/lib/use-items-per-page"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell"
import { PinToTrayButton } from "@/components/pin-to-tray-button"
import { apiClient } from "@/lib/api-client"

/**
 * Nômade › Ganhos.
 *
 * Até 2026-08-04 esta tela rodava em listas fixas dentro do arquivo (`MONTHLY`,
 * `PAYMENTS`) — mostrava dinheiro que não existia. Agora consome
 * `GET /api/nomades/me/resumo`.
 *
 * O que é somado aqui é a ETAPA, não a tarefa: com o motor de etapas, o valor
 * (`valor_nomade`) fica na etapa e cada uma pode ter dono diferente. Somar por
 * tarefa colocaria no bolso dele o trabalho de outra pessoa.
 *
 * O painel de bônus por nível saiu junto com o mock: a plataforma não calcula
 * bônus em lugar nenhum, então a projeção "no Gold você ganharia X a mais" era
 * inventada. No lugar entrou o resumo real de etapas.
 */

interface HistoricoItem {
  id: string
  titulo: string
  tarefa: string
  task_code: string | null
  projeto: string | null
  valor: number | null
  concluida_em: string | null
}

interface Resumo {
  nomade: { name: string; level: string | null }
  etapas: { total: number; concluidas: number; em_aberto: number; atrasadas: number }
  ganhos: {
    total_concluido: number
    no_mes: number
    previsto_em_aberto: number
    horas_concluidas: number
    por_mes: { mes: string; valor: number; etapas: number }[]
  }
  historico: HistoricoItem[]
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const fmtData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—"

/** "2026-01" → "Jan/26". O backend manda AAAA-MM justamente para não fixar isto. */
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const rotuloMes = (mes: string) => {
  const [ano, m] = mes.split("-")
  return `${MESES[Number(m) - 1] ?? m}/${ano.slice(2)}`
}

const mesCorrente = () => {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
}

export default function NomadesGanhosPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
  } = useSorting()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("nomades-ganhos", 10)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r: any = await apiClient.getResumoNomade()
      setResumo(r ?? null)
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar seus ganhos."),
      )
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const historico = resumo?.historico ?? []
  const ganhos = resumo?.ganhos
  const etapas = resumo?.etapas

  // Média por etapa concluída, não por tarefa: é a etapa que tem valor.
  const mediaPorEtapa =
    etapas?.concluidas && ganhos ? ganhos.total_concluido / etapas.concluidas : 0

  const porMes = ganhos?.por_mes ?? []
  const maxBar = Math.max(...porMes.map((m) => m.valor), 1)
  const mesAtual = mesCorrente()

  const sorted = useMemo(() => sortData(historico), [sortData, historico])
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginado = sorted.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  )

  const exportarCsv = () => {
    const linhas = [
      ["Etapa", "Tarefa", "Código", "Projeto", "Concluída em", "Valor"],
      ...historico.map((h) => [
        h.titulo,
        h.tarefa,
        h.task_code ?? "",
        h.projeto ?? "",
        fmtData(h.concluida_em),
        String(h.valor ?? 0).replace(".", ","),
      ]),
    ]
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "ganhos.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Wallet}
            title="Ganhos"
            description={
              carregando
                ? "Carregando…"
                : ganhos
                  ? `${fmtBRL(ganhos.total_concluido)} recebidos · ${fmtBRL(ganhos.previsto_em_aberto)} em execução`
                  : "Histórico de entregas e valores por etapa"
            }
            actions={
              <>
                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={exportarCsv}
                        disabled={historico.length === 0}
                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>Exportar ganhos</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PinToTrayButton id="page-nomades-ganhos" label="Ganhos" icon={Wallet} path="/nomades/ganhos" />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando seus ganhos…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : !ganhos || !etapas ? (
              <div className="py-16 text-center">
                <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nada para mostrar ainda.</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-linear-to-br from-violet-600 to-violet-700 p-4 text-white shadow-sm">
                    <Wallet className="h-5 w-5 text-white/60 mb-2" />
                    <p className="text-2xl font-bold">{fmtBRL(ganhos.total_concluido)}</p>
                    <p className="text-xs text-white/60 mt-0.5">Total ganho</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(ganhos.no_mes)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Este mês</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <Target className="h-5 w-5 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {etapas.concluidas ? fmtBRL(mediaPorEtapa) : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Média por etapa</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <Clock className="h-5 w-5 text-amber-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtBRL(ganhos.previsto_em_aberto)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Previsto ({etapas.em_aberto} {etapas.em_aberto === 1 ? "etapa" : "etapas"} em aberto)
                    </p>
                  </div>
                </div>

                {/* Série mensal */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ganhos Mensais</h3>
                    <span className="text-xs text-slate-400">Últimos 7 meses</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {porMes.map((m) => {
                      const pct = (m.valor / maxBar) * 100
                      const atual = m.mes === mesAtual
                      return (
                        <div
                          key={m.mes}
                          className="flex h-full flex-col items-center gap-1 flex-1 min-w-0"
                        >
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:block truncate w-full text-center">
                            {m.valor > 0 ? fmtBRL(m.valor).replace("R$ ", "R$") : ""}
                          </span>
                          {/*
                            A barra precisa de um pai com altura já resolvida
                            (`flex-1`), e a coluna de `h-full`: sem isso a
                            altura em % não tem contra o que resolver e o
                            gráfico achata numa linha — era o que acontecia no
                            layout herdado do mock.
                          */}
                          <div className="flex-1 w-full flex items-end">
                            <div
                              className={`w-full rounded-t transition-all ${atual ? "bg-violet-500" : "bg-slate-200 dark:bg-slate-700"}`}
                              style={{
                                height: `${Math.max(pct, m.valor > 0 ? 8 : 2)}%`,
                                minHeight: 4,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 truncate w-full text-center">
                            {rotuloMes(m.mes)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Resumo real de etapas — substituiu o painel de bônus por nível */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Suas Etapas
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-800">
                        <span className="text-slate-500">Nível</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
                          {resumo?.nomade?.level ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Concluídas
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{etapas.concluidas}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          Em aberto
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{etapas.em_aberto}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                          Atrasadas
                        </span>
                        <span
                          className={`font-semibold ${etapas.atrasadas > 0 ? "text-orange-600" : "text-slate-700 dark:text-slate-200"}`}
                        >
                          {etapas.atrasadas}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      {ganhos.horas_concluidas > 0
                        ? `${ganhos.horas_concluidas}h entregues no total.`
                        : "As horas aparecem aqui conforme as etapas são concluídas."}
                    </p>
                  </div>

                  {/* Histórico de entregas */}
                  <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Entregas Pagas
                      </h3>
                      <ItemsPerPageSelect
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}
                        variant="top"
                      />
                    </div>

                    {historico.length === 0 ? (
                      <div className="py-14 text-center">
                        <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          Você ainda não concluiu nenhuma etapa.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto allka-table-scroll">
                          <table className="tabela-cartao w-full text-sm">
                            <thead>
                              <tr className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-4 py-2.5 text-left font-medium">
                                  <SortableHeader label="Etapa" field="titulo" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                                </th>
                                <th className="px-4 py-2.5 text-left font-medium">
                                  <SortableHeader label="Projeto" field="projeto" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                                </th>
                                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                                  <SortableHeader label="Concluída" field="concluida_em" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                                </th>
                                <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                                  <SortableHeader label="Valor" field="valor" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {paginado.map((h: HistoricoItem) => (
                                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td data-rotulo="Etapa" className="px-4 py-3">
                                    <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-40">
                                      {h.titulo}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate max-w-40">
                                      {h.tarefa}
                                      {h.task_code ? ` · ${h.task_code}` : ""}
                                    </p>
                                  </td>
                                  <td data-rotulo="Projeto" className="px-4 py-3 text-slate-500 text-xs">
                                    <span className="truncate block max-w-36">{h.projeto ?? "—"}</span>
                                  </td>
                                  <td data-rotulo="Concluída" className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                    {fmtData(h.concluida_em)}
                                  </td>
                                  <td data-rotulo="Valor" className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                    {h.valor ? fmtBRL(h.valor) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
                            <span className="text-sm text-slate-500">
                              Página {safeCurrentPage} de {totalPages}
                            </span>
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
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
