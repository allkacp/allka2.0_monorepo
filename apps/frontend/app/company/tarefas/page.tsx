"use client";

import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useEmpresa, type EmpresaTask } from "@/contexts/empresa-context";
import {
  Search,
  ListChecks,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/loading";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";

/**
 * Empresa › Tarefas.
 *
 * É aqui que o cliente fecha o ciclo de entrega. A aprovação tem dois níveis:
 * a agência confere primeiro e só depois a tarefa chega ao cliente como
 * `APROVACAO_PENDENTE_CLIENTE` (ver PATCH /api/project-tasks/:id/aprovar). Até
 * 2026-08-05 esta tela não tinha nenhuma ação — a tarefa parava esperando um
 * aceite que não existia botão para dar.
 *
 * Não reusa o `TarefaDetailDrawer` de propósito: aquele drawer é a visão
 * interna (valor do nômade, etapas, histórico de atribuição) e nada disso é do
 * cliente. Aqui ele vê o que contratou e decide: aceita ou pede ajuste.
 *
 * Sem coluna de valor: `ProjectTask` não tem campo de preço nenhum, então o
 * `task.value` que esta tela lia era sempre `undefined` e a coluna exibia
 * R$ 0,00 em toda linha. O único valor por tarefa que existe no modelo é
 * `ProjectTaskStage.valor_nomade` — custo interno, que não se mostra ao
 * cliente. Preço contratado vive no produto do projeto, não aqui.
 */

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const STATUS_CONFIG: Record<
  EmpresaTask["status"],
  { label: string; bg: string }
> = {
  available: { label: "Aguardando início", bg: "bg-slate-100 text-slate-500" },
  in_progress: { label: "Em execução", bg: "bg-blue-100 text-blue-700" },
  review: { label: "Em revisão", bg: "bg-amber-100 text-amber-700" },
  approval: { label: "Em aprovação", bg: "bg-indigo-100 text-indigo-700" },
  done: { label: "Concluída", bg: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", bg: "bg-red-100 text-red-700" },
};

const STATUS_LABELS: Record<string, string> = {
  all: "Todas",
  available: "Aguardando início",
  in_progress: "Em execução",
  review: "Em revisão",
  approval: "Em aprovação",
  done: "Concluída",
};

export default function EmpresaTarefas() {
  const location = useLocation();
  const { tasks, loading, refetch } = useEmpresa();
  const [search, setSearch] = useState<string>(
    (location.state as any)?.search ?? "",
  );
  const [statusFilter, setStatusFilter] = useState("all");

  // Aprovação
  const [processando, setProcessando] = useState<string | null>(null);
  const [ajusteDe, setAjusteDe] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting();

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (t.nomadeName?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = sortData(filtered);

  const aguardando = useMemo(
    () => tasks.filter((t) => t.aguardandoMinhaAprovacao),
    [tasks],
  );

  const aprovar = async (task: EmpresaTask) => {
    setProcessando(task.id);
    setErro(null);
    setAviso(null);
    try {
      await apiClient.aprovarTarefa(task.id, "cliente");
      setAviso(`"${task.name}" aprovada. A tarefa foi encerrada.`);
      await refetch();
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível aprovar a tarefa.");
    } finally {
      setProcessando(null);
    }
  };

  const pedirAjuste = async (task: EmpresaTask) => {
    if (motivo.trim().length < 3) return;
    setProcessando(task.id);
    setErro(null);
    setAviso(null);
    try {
      await apiClient.reprovarTarefa(task.id, motivo.trim(), "cliente");
      setAviso(`"${task.name}" devolvida para ajuste com o seu comentário.`);
      setAjusteDe(null);
      setMotivo("");
      await refetch();
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível devolver a tarefa.");
    } finally {
      setProcessando(null);
    }
  };

  if (loading) {
    return <PageLoader text="Carregando tarefas…" />;
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
        <div className="h-full min-h-0 flex flex-col overflow-y-auto p-6 space-y-6">
          <div className="shrink-0 -mb-[11px]">
            <StandardPageBanner
              icon={ListChecks}
              title="Tarefas"
              description={
                aguardando.length > 0
                  ? `${aguardando.length} ${aguardando.length === 1 ? "tarefa aguarda" : "tarefas aguardam"} a sua aprovação`
                  : "Acompanhe o andamento das tarefas dos seus projetos"
              }
              actions={
                <PinToTrayButton
                  id="page-company-tarefas"
                  label="Tarefas"
                  icon={ListChecks}
                  path="/company/tarefas"
                />
              }
            />
          </div>

          {aviso && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-medium text-emerald-800">{aviso}</p>
            </div>
          )}
          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-700">{erro}</p>
            </div>
          )}

          {/* Fila de aprovação — só o que depende de uma decisão dele */}
          {aguardando.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-semibold text-indigo-900">
                  Aguardando a sua aprovação
                </h3>
              </div>
              <p className="text-xs text-indigo-700/80 leading-relaxed">
                A agência já conferiu estas entregas. Aprovar encerra a tarefa;
                pedir ajuste devolve para a equipe com o seu comentário.
              </p>

              <div className="space-y-2">
                {aguardando.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-indigo-100 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t.projectName}
                          {t.category ? ` · ${t.category}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={processando === t.id}
                          onClick={() => {
                            setAjusteDe(ajusteDe === t.id ? null : t.id);
                            setMotivo("");
                          }}
                        >
                          <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
                          Pedir ajuste
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          disabled={processando === t.id}
                          onClick={() => aprovar(t)}
                        >
                          {processando === t.id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Aprovar
                        </Button>
                      </div>
                    </div>

                    {ajusteDe === t.id && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <label className="text-xs font-medium text-slate-600">
                          O que precisa ser ajustado?
                        </label>
                        <Textarea
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          rows={3}
                          placeholder="Descreva o que não ficou como esperado. Este texto vai para quem executou."
                          className="text-sm"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => {
                              setAjusteDe(null);
                              setMotivo("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={
                              motivo.trim().length < 3 || processando === t.id
                            }
                            onClick={() => pedirAjuste(t)}
                          >
                            {processando === t.id && (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            )}
                            Devolver para ajuste
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {(
              Object.entries(STATUS_CONFIG) as [
                EmpresaTask["status"],
                { label: string; bg: string },
              ][]
            )
              .filter(([k]) => k !== "cancelled")
              .map(([key, cfg]) => {
                const count = tasks.filter((t) => t.status === key).length;
                return (
                  <div
                    key={key}
                    className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
                  >
                    <Badge className={`${cfg.bg} border-0 text-xs mb-2`}>
                      {cfg.label}
                    </Badge>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                  </div>
                );
              })}
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tarefa, projeto ou nômade..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={statusFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(key)}
                  className="h-9 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tabela-cartao w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader
                        label="Tarefa"
                        field="name"
                        type="text"
                        sortKey={sortKey ? String(sortKey) : null}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader
                        label="Projeto"
                        field="projectName"
                        type="text"
                        sortKey={sortKey ? String(sortKey) : null}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Nômade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader
                        label="Status"
                        field="status"
                        type="status"
                        sortKey={sortKey ? String(sortKey) : null}
                        sortDir={sortDir}
                        onSort={handleSort}
                        columnFilters={columnFilters}
                        onFilter={toggleColumnFilter}
                        onClearFilter={clearColumnFilter}
                        filterValues={[
                          ...new Set(
                            filtered.map((t) => t.status).filter(Boolean),
                          ),
                        ]}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader
                        label="Entrega"
                        field="deliveredAt"
                        type="date"
                        sortKey={sortKey ? String(sortKey) : null}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        {tasks.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-slate-600 font-medium text-sm">
                              Nenhuma tarefa ainda
                            </p>
                            <p className="text-slate-400 text-xs max-w-xs">
                              As tarefas dos seus projetos aparecerão aqui após
                              a contratação e início.
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">
                            Nenhuma tarefa encontrada com os filtros aplicados.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((task: EmpresaTask) => {
                      const cfg = STATUS_CONFIG[task.status];
                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td data-rotulo="Tarefa" className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {task.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {task.category}
                            </p>
                          </td>
                          <td data-rotulo="Projeto" className="px-4 py-3 text-slate-600 text-xs">
                            {task.projectName}
                          </td>
                          <td data-rotulo="Nômade" className="px-4 py-3 text-slate-600 text-xs">
                            {task.nomadeName ?? (
                              <span className="text-slate-400">
                                Não atribuído
                              </span>
                            )}
                          </td>
                          <td data-rotulo="Status" className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                className={`${cfg?.bg ?? "bg-slate-100 text-slate-500"} border-0 text-xs`}
                              >
                                {cfg?.label ?? task.rawStatus ?? "—"}
                              </Badge>
                              {task.aguardandoMinhaAprovacao && (
                                <span className="text-[10px] font-semibold text-indigo-600 whitespace-nowrap">
                                  ← sua vez
                                </span>
                              )}
                            </div>
                          </td>
                          <td data-rotulo="Entrega" className="px-4 py-3 text-xs text-slate-500">
                            {task.status === "done"
                              ? fmtDate(task.deliveredAt)
                              : fmtDate(task.dueDate)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
