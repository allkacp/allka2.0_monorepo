import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2, XCircle, Wallet, TrendingUp, Calendar, Clock,
  Download, ChevronDown, ChevronLeft, ChevronRight, History, Loader2,
} from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
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
 * Nômade › Histórico.
 *
 * Até 2026-08-04 esta tela rodava numa lista fixa (`HISTORY`) com avaliação,
 * feedback do cliente e bônus por nível. Agora consome
 * `GET /api/nomades/me/resumo` — e as colunas que não têm origem no modelo novo
 * saíram junto com o mock: rating, feedback e bônus são subsistemas da
 * plataforma antiga que não foram trazidos (ver docs/motor-tarefas-legado.md,
 * "o que ficou deliberadamente de fora"). Exibi-los seria inventar número.
 *
 * O que sobrou é real: a etapa concluída, o valor dela, quando saiu e se saiu
 * dentro do prazo. A unidade é a ETAPA, não a tarefa — é ela que ele executa e
 * é nela que está o valor.
 */

interface HistItem {
  id: string
  titulo: string
  tarefa: string
  task_code: string | null
  projeto: string | null
  valor: number | null
  horas: number | null
  concluida_em: string | null
  prazo_execucao: string | null
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const fmtData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

/** Chave AAAA-MM da conclusão; agrupa o filtro de período. */
const chaveMes = (d: string | null) => {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
}

const rotuloMes = (chave: string) => {
  const [ano, m] = chave.split("-")
  return `${MESES[Number(m) - 1] ?? m}/${ano.slice(2)}`
}

/**
 * Etapa sem prazo definido não conta como atraso nem como acerto: `null`.
 * O motor só preenche `prazo_execucao` quando a config da etapa traz horas de
 * execução, então tratar ausência como "no prazo" inflaria a estatística.
 */
const saiuNoPrazo = (h: HistItem): boolean | null => {
  if (!h.prazo_execucao || !h.concluida_em) return null
  return new Date(h.concluida_em) <= new Date(h.prazo_execucao)
}

export default function NomadesHistoricoPage() {
  const [historico, setHistorico] = useState<HistItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [mes, setMes] = useState("todos")
  const [detail, setDetail] = useState<HistItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("nomades-historico", 10)
  const { sortKey, sortDir, handleSort, sortData } = useSorting<HistItem>()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r: any = await apiClient.getResumoNomade()
      setHistorico(Array.isArray(r?.historico) ? r.historico : [])
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar seu histórico."),
      )
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Os meses do filtro vêm do que ele de fato entregou, não de uma lista fixa.
  const meses = useMemo(() => {
    const vistos: string[] = []
    for (const h of historico) {
      const k = chaveMes(h.concluida_em)
      if (k && !vistos.includes(k)) vistos.push(k)
    }
    return vistos.sort().reverse()
  }, [historico])

  const filtrado = useMemo(
    () => (mes === "todos" ? historico : historico.filter((h) => chaveMes(h.concluida_em) === mes)),
    [historico, mes],
  )

  const sorted = useMemo(() => sortData(filtrado), [sortData, filtrado])
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginado = sorted.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  )

  const totalGanho = filtrado.reduce((s, h) => s + (h.valor ?? 0), 0)
  const totalHoras = filtrado.reduce((s, h) => s + (h.horas ?? 0), 0)
  const avaliaveis = filtrado.map(saiuNoPrazo).filter((v): v is boolean => v !== null)
  const pctNoPrazo = avaliaveis.length
    ? Math.round((avaliaveis.filter(Boolean).length / avaliaveis.length) * 100)
    : null

  const exportarCsv = () => {
    const linhas = [
      ["Etapa", "Tarefa", "Código", "Projeto", "Concluída em", "Prazo", "Valor"],
      ...filtrado.map((h) => [
        h.titulo,
        h.tarefa,
        h.task_code ?? "",
        h.projeto ?? "",
        fmtData(h.concluida_em),
        fmtData(h.prazo_execucao),
        String(h.valor ?? 0).replace(".", ","),
      ]),
    ]
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "historico.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={History}
            title="Histórico"
            description={
              carregando
                ? "Carregando…"
                : `${historico.length} ${historico.length === 1 ? "etapa concluída" : "etapas concluídas"} · últimas 50`
            }
            actions={
              <>
                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={exportarCsv}
                        disabled={filtrado.length === 0}
                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>Exportar histórico</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PinToTrayButton id="page-nomades-historico" label="Histórico" icon={History} path="/nomades/historico" />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando seu histórico…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : historico.length === 0 ? (
              <div className="py-16 text-center">
                <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Você ainda não concluiu nenhuma etapa.</p>
              </div>
            ) : (
              <>
                {/* Resumo do período */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-linear-to-br from-violet-600 to-violet-700 p-4 text-white shadow-sm">
                    <Wallet className="h-4 w-4 text-white/60 mb-1.5" />
                    <p className="text-xl font-bold">{fmtBRL(totalGanho)}</p>
                    <p className="text-xs text-white/60 mt-0.5">Total no período</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <TrendingUp className="h-4 w-4 text-emerald-500 mb-1.5" />
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{filtrado.length}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Etapas concluídas</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <Clock className="h-4 w-4 text-amber-500 mb-1.5" />
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {totalHoras > 0 ? `${totalHoras}h` : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Horas entregues</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mb-1.5" />
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {pctNoPrazo === null ? "—" : `${pctNoPrazo}%`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {pctNoPrazo === null ? "Sem prazo definido" : "Entregues no prazo"}
                    </p>
                  </div>
                </div>

                {/* Filtro por mês */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  {[{ k: "todos", label: "Todos" }, ...meses.map((k) => ({ k, label: rotuloMes(k) }))].map((m) => (
                    <button
                      key={m.k}
                      onClick={() => { setMes(m.k); setCurrentPage(1) }}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        mes === m.k
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {m.label}
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

                {/* Tabela */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto allka-table-scroll">
                    <table className="tabela-cartao w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3 text-left font-medium">
                            <SortableHeader label="Etapa" field="titulo" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            <SortableHeader label="Projeto" field="projeto" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                          </th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                            <SortableHeader label="Concluída em" field="concluida_em" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                          </th>
                          <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                            <SortableHeader label="Valor" field="valor" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                          </th>
                          <th className="px-4 py-3 text-center font-medium">Prazo</th>
                          <th className="px-4 py-3 text-center font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginado.map((h) => {
                          const noPrazo = saiuNoPrazo(h)
                          return (
                            <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td data-rotulo="Etapa" className="px-4 py-3">
                                <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-44">{h.titulo}</p>
                                <p className="text-xs text-slate-400 truncate max-w-44">
                                  {h.tarefa}
                                  {h.task_code ? ` · ${h.task_code}` : ""}
                                </p>
                              </td>
                              <td data-rotulo="Projeto" className="px-4 py-3 text-slate-500 text-xs">
                                <span className="truncate block max-w-36">{h.projeto ?? "—"}</span>
                              </td>
                              <td data-rotulo="Concluída em" className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                {fmtData(h.concluida_em)}
                              </td>
                              <td data-rotulo="Valor" className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                {h.valor ? fmtBRL(h.valor) : "—"}
                              </td>
                              <td data-rotulo="Prazo" className="px-4 py-3 text-center">
                                {noPrazo === null ? (
                                  <span className="text-slate-300 text-xs">—</span>
                                ) : noPrazo ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-slate-400 hover:text-slate-600"
                                  onClick={() => setDetail(h)}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filtrado.length === 0 && (
                    <div className="text-center py-14 text-slate-400">
                      <p className="text-sm">Nenhuma etapa concluída neste período</p>
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

                {/* Detalhe da etapa */}
                <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
                  <SheetContent side="right" hideOverlay className="w-full sm:max-w-md overflow-y-auto">
                    {detail && (
                      <>
                        <SheetTitle className="text-base font-bold pr-6">{detail.titulo}</SheetTitle>
                        <div className="mt-4 space-y-4">
                          <p className="text-sm text-slate-500">
                            {detail.tarefa}
                            {detail.task_code ? ` · ${detail.task_code}` : ""}
                          </p>
                          {detail.projeto && (
                            <p className="text-xs text-slate-400">Projeto: {detail.projeto}</p>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Valor da etapa</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {detail.valor ? fmtBRL(detail.valor) : "—"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Horas previstas</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {detail.horas ? `${detail.horas}h` : "—"}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-3 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 text-xs">Concluída em</span>
                              <span className="text-slate-700 dark:text-slate-200">{fmtData(detail.concluida_em)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 text-xs">Prazo</span>
                              <span className="text-slate-700 dark:text-slate-200">{fmtData(detail.prazo_execucao)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {saiuNoPrazo(detail) === null ? (
                              <>
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-500">Esta etapa não tinha prazo definido.</span>
                              </>
                            ) : saiuNoPrazo(detail) ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-600 dark:text-slate-300">Entregue no prazo</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-400" />
                                <span className="text-slate-600 dark:text-slate-300">Entregue com atraso</span>
                              </>
                            )}
                          </div>

                          <Button variant="outline" className="w-full" onClick={() => setDetail(null)}>
                            Fechar
                          </Button>
                        </div>
                      </>
                    )}
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
