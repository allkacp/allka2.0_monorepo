/**
 * Central administrativa de "possível alucinação" (bloco 2/4, Admin Master).
 * Nunca corrige memória sozinha — toda edição de memória passa pela API
 * oficial do bloco 1 (aba Memória do projeto) e gera o MemoryHistoryEvent
 * normal. Aqui só se investiga, diagnostica e encerra o relato em si.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, User, FolderKanban, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { AlertTimeline } from "@/components/alert-timeline";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type StatusFilter = "novo" | "em_analise" | "resolvido" | "descartado" | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "novo", label: "Novos" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "descartado", label: "Descartados" },
  { value: "all", label: "Todos" },
];

const STATUS_BADGE: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700 border-blue-300",
  em_analise: "bg-amber-100 text-amber-700 border-amber-300",
  resolvido: "bg-emerald-100 text-emerald-700 border-emerald-300",
  descartado: "bg-slate-100 text-slate-600 border-slate-300",
};

const CATEGORY_LABEL: Record<string, string> = {
  informacao_incorreta: "Informação incorreta",
  instrucao_ignorada: "Instrução ignorada",
  tom_inadequado: "Tom inadequado",
  dado_inventado: "Dado inventado",
  outro: "Outro",
};

const IMPACT_BADGE: Record<string, string> = {
  baixo: "bg-slate-100 text-slate-600",
  medio: "bg-amber-100 text-amber-700",
  alto: "bg-red-100 text-red-700",
};

const LAYER_LABEL: Record<string, string> = { project: "Projeto", company: "Empresa/Company", agency: "Agência" };

interface ReportRow {
  id: string;
  project_id: string;
  reported_by_user_id: string;
  description: string;
  questioned_response: string | null;
  category: string;
  impact: string;
  status: string;
  assigned_admin_user_id: string | null;
  suspected_origin_layer: string | null;
  suspected_origin_memory_id: string | null;
  diagnosis_note: string | null;
  snapshot_id: string | null;
  project_task: { id: string; title: string } | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RelatosIAPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("novo");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listHallucinationReports(statusFilter === "all" ? {} : { status: statusFilter });
      setRows(res.data);
      setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar os relatos agora.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner icon={ShieldAlert} title="Relatos de possível alucinação" description={`${total} relato${total !== 1 ? "s" : ""} nesta visão`} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pt-1">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap mb-4 w-max">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={statusFilter === tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  statusFilter === tab.value ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-500">{loadError}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-10 text-center">Nenhum relato nesta visão.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs border", STATUS_BADGE[row.status])}>{STATUS_TABS.find((t) => t.value === row.status)?.label ?? row.status}</Badge>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", IMPACT_BADGE[row.impact])}>Impacto {row.impact}</span>
                      <span className="text-xs text-slate-500">{CATEGORY_LABEL[row.category] ?? row.category}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDate(row.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1.5 line-clamp-2">{row.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" /> {row.project_id}
                    </span>
                    {row.project_task && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {row.project_task.title}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedId && <ReportDetailDialog reportId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />}
    </div>
  );
}

interface HistoryEvent {
  id: string;
  event_type: string;
  actor_user_id: string;
  description: string;
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  created: "relato criado",
  assumed_analysis: "análise assumida",
  marked_suspected_origin: "origem suspeita marcada",
  diagnosis_recorded: "diagnóstico registrado",
  resolved: "resolvido",
  discarded: "descartado",
  file_added: "anexo adicionado",
  file_removed: "anexo removido",
};

function ReportDetailDialog({ reportId, onClose, onChanged }: { reportId: string; onClose: () => void; onChanged: () => void }) {
  const [report, setReport] = useState<ReportRow | null>(null);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diagnosisDraft, setDiagnosisDraft] = useState("");
  const [suspectedLayer, setSuspectedLayer] = useState<"project" | "company" | "agency" | "">("");
  const [closeJustification, setCloseJustification] = useState("");
  const [closeActionId, setCloseActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, hist] = await Promise.all([apiClient.getHallucinationReport(reportId), apiClient.getHallucinationReportHistory(reportId)]);
      setReport(detail.report);
      setHistory(
        (hist.history as any[]).map((h) => ({
          id: h.id,
          event_type: h.event_type,
          actor_user_id: h.actor_user_id,
          description: h.description,
          created_at: h.created_at,
        })),
      );
      setDiagnosisDraft(detail.report.diagnosis_note ?? "");
      setSuspectedLayer(detail.report.suspected_origin_layer ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o relato agora.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withAction(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível concluir a ação agora.");
    } finally {
      setBusy(false);
    }
  }

  const timelineEvents = (history ?? []).map((h) => ({ id: h.id, event_type: h.event_type, description: `${EVENT_LABEL[h.event_type] ?? h.event_type} — ${h.description}`, created_at: h.created_at }));

  return (
    <StandardModalDialog open onClose={onClose} title="Relato de possível alucinação" size="large">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : error || !report ? (
        <p className="text-sm text-red-500">{error ?? "Relato não encontrado."}</p>
      ) : (
        <div className="space-y-5">
          {actionError && <p className="text-sm text-red-500">{actionError}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs border", STATUS_BADGE[report.status])}>{STATUS_TABS.find((t) => t.value === report.status)?.label ?? report.status}</Badge>
            <span className="text-xs text-slate-500">{CATEGORY_LABEL[report.category] ?? report.category}</span>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", IMPACT_BADGE[report.impact])}>Impacto {report.impact}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Relato</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{report.description}</p>
          </div>

          {report.questioned_response && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Resposta/trecho questionado</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 rounded-lg p-2">{report.questioned_response}</p>
            </div>
          )}

          {report.snapshot_id && <SnapshotPreview projectId={report.project_id} snapshotId={report.snapshot_id} />}

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-500">Ações administrativas</p>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={busy || report.status === "resolvido" || report.status === "descartado"}
                onClick={() => void withAction(async () => { await apiClient.assumeHallucinationAnalysis(report.id, report.updated_at); })}
              >
                Assumir análise
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={suspectedLayer}
                onChange={(e) => setSuspectedLayer(e.target.value as any)}
                className="h-8 text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2"
                disabled={busy}
              >
                <option value="">Marcar camada suspeita...</option>
                <option value="project">Projeto</option>
                <option value="company">Empresa/Company</option>
                <option value="agency">Agência</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={busy || !suspectedLayer}
                onClick={() =>
                  void withAction(async () => {
                    await apiClient.markHallucinationSuspectedOrigin(report.id, suspectedLayer as any, null, report.updated_at);
                  })
                }
              >
                Marcar origem
              </Button>
              {report.suspected_origin_layer && <span className="text-[11px] text-slate-400">Atual: {LAYER_LABEL[report.suspected_origin_layer] ?? report.suspected_origin_layer}</span>}
            </div>

            <div className="space-y-1.5">
              <Textarea value={diagnosisDraft} onChange={(e) => setDiagnosisDraft(e.target.value)} rows={2} placeholder="Diagnóstico administrativo..." disabled={busy} className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={busy || !diagnosisDraft.trim()}
                onClick={() => void withAction(async () => { await apiClient.recordHallucinationDiagnosis(report.id, diagnosisDraft.trim(), report.updated_at); })}
              >
                Registrar diagnóstico
              </Button>
            </div>

            {report.status !== "resolvido" && report.status !== "descartado" && (
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                <Textarea value={closeJustification} onChange={(e) => setCloseJustification(e.target.value)} rows={2} placeholder="Justificativa obrigatória para resolver/descartar..." disabled={busy} className="text-xs" />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs btn-brand border-0"
                    disabled={busy || !closeJustification.trim()}
                    onClick={() =>
                      void withAction(async () => {
                        const actionId = closeActionId ?? crypto.randomUUID();
                        setCloseActionId(actionId);
                        await apiClient.closeHallucinationReport(report.id, "resolvido", closeJustification.trim(), actionId, report.updated_at);
                      })
                    }
                  >
                    Resolver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={busy || !closeJustification.trim()}
                    onClick={() =>
                      void withAction(async () => {
                        const actionId = closeActionId ?? crypto.randomUUID();
                        setCloseActionId(actionId);
                        await apiClient.closeHallucinationReport(report.id, "descartado", closeJustification.trim(), actionId, report.updated_at);
                      })
                    }
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Timeline administrativa
            </p>
            <AlertTimeline events={timelineEvents} />
          </div>
        </div>
      )}
    </StandardModalDialog>
  );
}

function SnapshotPreview({ projectId, snapshotId }: { projectId: string; snapshotId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMemoryContextSnapshot(projectId, snapshotId)
      .then((res) => {
        setText(res.text);
        setLayers(res.layers ?? []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar o contexto usado."));
  }, [projectId, snapshotId]);

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">Contexto exato utilizado (snapshot)</p>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : text === null ? (
        <p className="text-xs text-slate-400">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {layers.map((layer: any) => (
            <div key={layer.scope} className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium">{LAYER_LABEL[layer.scope] ?? layer.scope}:</span> {layer.present ? "presente" : "ausente"}
            </div>
          ))}
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500">Ver texto completo</summary>
            <pre className="whitespace-pre-wrap break-words text-[11px] bg-slate-50 dark:bg-slate-900 p-2 rounded-lg mt-1 max-h-48 overflow-y-auto">{text}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
