/**
 * IA de Lançamento / Plano Tático (bloco 3/4) — conversa persistente dentro
 * do projeto. NUNCA materializa tarefa/etapa real: aprovar aqui só marca
 * "rascunho de lançamento pronto", nunca "liberado pra execução" (isso é o
 * bloco 4). Segue o container padrão da aba de projeto (mesmo shell da
 * Memória).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Paperclip, X, AlertTriangle, CheckCircle2, Ban, RefreshCw, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trash2, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { HallucinationReportDialog } from "@/components/hallucination-report-dialog";
import { apiClient, ApiError } from "@/lib/api-client";

interface LaunchTask {
  title: string;
  objective: string;
  description: string;
  deliverable: string;
  steps: string[];
  suggested_duration_days: number;
  required_specialty: string;
  responsible_user_id?: string | null;
  prerequisites: string[];
  approval_criteria: string[];
  references: string[];
  justification: string;
  open_questions: string[];
}

interface LaunchWave {
  name: string;
  objective: string;
  trigger_type: "data" | "aprovacao_tarefa_anterior" | "pagamento_nova_etapa" | "aprovacao_manual_gestor";
  trigger_date?: string | null;
  trigger_note?: string | null;
  task_titles: string[];
}

interface LaunchPlan {
  plan_summary: string;
  plan_duration_months?: number | null;
  plan_duration_days_custom?: number | null;
  waves: LaunchWave[];
  tasks: LaunchTask[];
}

interface LaunchMessageFileDto {
  id: string;
  name: string;
  size: number;
}

interface LaunchMessageDto {
  id: string;
  role: "user" | "assistant" | "system";
  actor_user_id: string | null;
  content: string;
  status: "ok" | "error";
  execution_id: string | null;
  created_at: string;
  files: LaunchMessageFileDto[];
}

interface LaunchExecutionDto {
  id: string;
  status: "pending" | "succeeded" | "failed" | "cancelled" | "timeout";
  snapshot_id: string | null;
  error_message: string | null;
}

interface LaunchVersionDto {
  id: string;
  version_number: number;
  source: "ia_gerada" | "humano_editado";
  structured_json: string;
  created_at: string;
}

interface LaunchSessionDto {
  id: string;
  project_id: string;
  status: string;
  current_version_id: string | null;
  approved_version_id: string | null;
  pending_questions_json: string | null;
  updated_at: string;
  messages: LaunchMessageDto[];
  versions: LaunchVersionDto[];
  executions: LaunchExecutionDto[];
}

const STATUS_LABEL: Record<string, string> = {
  coletando_informacoes: "Coletando informações",
  aguardando_respostas: "Aguardando respostas",
  proposta_gerada: "Proposta gerada",
  em_revisao: "Em revisão",
  aprovada_como_rascunho: "Aprovada como rascunho",
  cancelada: "Cancelada",
};

const TRIGGER_LABEL: Record<string, string> = {
  data: "Data",
  aprovacao_tarefa_anterior: "Aprovação da tarefa anterior",
  pagamento_nova_etapa: "Pagamento de nova etapa",
  aprovacao_manual_gestor: "Aprovação manual do gestor",
};

function currentVersionPlan(session: LaunchSessionDto): { version: LaunchVersionDto; plan: LaunchPlan } | null {
  if (!session.current_version_id) return null;
  const version = session.versions.find((v) => v.id === session.current_version_id);
  if (!version) return null;
  try {
    return { version, plan: JSON.parse(version.structured_json) as LaunchPlan };
  } catch {
    return null;
  }
}

export function LaunchSessionPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<LaunchSessionDto | null>(null);
  // Otimista até a primeira sessão carregar (não há "can_manage" pra
  // verificar antes de existir uma sessão) — a criação/ação real sempre é
  // revalidada no servidor de qualquer forma, então mostrar o botão aqui
  // nunca é um risco de segurança, só uma conveniência de UI.
  const [canManage, setCanManage] = useState(true);
  const [starting, setStarting] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [pendingExecutionId, setPendingExecutionId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [reportDialog, setReportDialog] = useState<{ snapshotId: string | null; executionId: string } | null>(null);
  const [editingPlan, setEditingPlan] = useState<LaunchPlan | null>(null);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listLaunchSessions(projectId);
      const active = res.sessions?.[0] ?? null;
      setSessionId(active?.id ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar a IA de lançamento agora.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const res = await apiClient.getLaunchSession(id);
      setSession(res.session);
      setCanManage(Boolean(res.can_manage));
      return res.session as LaunchSessionDto;
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar a sessão agora.");
      return null;
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (sessionId) void loadSession(sessionId);
  }, [sessionId, loadSession]);

  // Indicador de processamento real: enquanto houver execução "pending",
  // poll até ela terminar (sucesso/erro/timeout/cancelada).
  useEffect(() => {
    if (!session) return;
    const pending = session.executions.find((e) => e.status === "pending");
    setPendingExecutionId(pending?.id ?? null);
    if (!pending) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const fresh = await loadSession(session.id);
      if (fresh && !fresh.executions.some((e: LaunchExecutionDto) => e.status === "pending")) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 2000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.executions.length]);

  async function handleStart() {
    setStarting(true);
    setLoadError(null);
    try {
      const res = await apiClient.createLaunchSession(projectId);
      setSessionId(res.session.id);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Não foi possível iniciar a conversa agora.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSend() {
    if (!session || !draft.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await apiClient.postLaunchMessage(session.id, draft.trim());
      setDraft("");
      await loadSession(session.id);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Não foi possível enviar a mensagem agora.");
    } finally {
      setSending(false);
    }
  }

  async function handleUpload(file: File) {
    if (!session) return;
    setUploading(true);
    try {
      const lastMessage = session.messages[session.messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        await apiClient.postLaunchMessage(session.id, `(anexo: ${file.name})`);
      }
      const fresh = await loadSession(session.id);
      const target = fresh?.messages[fresh.messages.length - 1];
      if (target) await apiClient.uploadLaunchMessageFile(session.id, target.id, file);
      await loadSession(session.id);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Não foi possível enviar o arquivo agora.");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!session) return;
    setGenerateError(null);
    try {
      const clientActionId = crypto.randomUUID();
      await apiClient.generateLaunchProposal(session.id, clientActionId);
      await loadSession(session.id);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Não foi possível iniciar a geração agora.");
    }
  }

  async function handleCancelGeneration() {
    if (!session || !pendingExecutionId) return;
    await apiClient.cancelLaunchGeneration(session.id, pendingExecutionId).catch(() => {});
  }

  async function handleApprove() {
    if (!session) return;
    setActionError(null);
    try {
      await apiClient.approveLaunchSession(session.id, session.updated_at);
      await loadSession(session.id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível aprovar agora.");
    } finally {
      setConfirmApprove(false);
    }
  }

  async function handleCancelSession() {
    if (!session) return;
    setActionError(null);
    try {
      await apiClient.cancelLaunchSession(session.id, session.updated_at);
      await loadSession(session.id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível cancelar agora.");
    } finally {
      setConfirmCancel(false);
    }
  }

  async function handleSubmitEdit(plan: LaunchPlan) {
    if (!session) return;
    setActionError(null);
    try {
      await apiClient.submitLaunchHumanEdit(session.id, plan, session.updated_at);
      setEditingPlan(null);
      await loadSession(session.id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível salvar a edição agora.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError && !session) {
    return <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{loadError}</div>;
  }

  if (!sessionId || !session) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Nenhuma conversa de lançamento iniciada ainda para este projeto.</p>
        {canManage && (
          <Button size="sm" className="btn-brand border-0" disabled={starting} onClick={() => void handleStart()}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Iniciar IA de Lançamento
          </Button>
        )}
      </div>
    );
  }

  const isClosed = session.status === "aprovada_como_rascunho" || session.status === "cancelada";
  const versionInfo = viewingVersionId
    ? (() => {
        const v = session.versions.find((x) => x.id === viewingVersionId);
        if (!v) return null;
        try {
          return { version: v, plan: JSON.parse(v.structured_json) as LaunchPlan };
        } catch {
          return null;
        }
      })()
    : currentVersionPlan(session);
  const pendingQuestions: string[] = session.pending_questions_json ? JSON.parse(session.pending_questions_json) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {STATUS_LABEL[session.status] ?? session.status}
        </span>
        <div className="flex items-center gap-2">
          {canManage && !isClosed && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!!pendingExecutionId} onClick={() => setConfirmCancel(true)}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar sessão
              </Button>
              {session.current_version_id && (
                <Button size="sm" className="h-7 text-xs btn-brand border-0" onClick={() => setConfirmApprove(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar como rascunho
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {actionError && <p className="text-xs text-red-500">{actionError}</p>}

      {pendingQuestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold mb-1">Perguntas pendentes da IA:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {pendingQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conversa */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2 max-h-96 overflow-y-auto">
        {session.messages.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma mensagem ainda — descreva o que precisa lançar.</p>}
        {session.messages.map((m) => {
          const execution = m.execution_id ? session.executions.find((e) => e.id === m.execution_id) : null;
          return (
            <div key={m.id} className={`rounded-lg p-2.5 text-sm ${m.role === "user" ? "bg-blue-50 dark:bg-blue-950/30 ml-8" : m.status === "error" ? "bg-red-50 dark:bg-red-900/20 mr-8" : "bg-slate-50 dark:bg-slate-900 mr-8"}`}>
              <p className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{m.content}</p>
              {m.files.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {m.files.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => void apiClient.downloadLaunchMessageFile(session.id, m.id, f.id).then((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); URL.revokeObjectURL(url); })}>
                        <Paperclip className="h-3 w-3" /> {f.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {m.role === "assistant" && m.status === "ok" && execution && (
                <button type="button" className="mt-1.5 text-[11px] text-amber-600 hover:underline flex items-center gap-1" onClick={() => setReportDialog({ snapshotId: execution.snapshot_id, executionId: execution.id })}>
                  <AlertTriangle className="h-3 w-3" /> Reportar possível alucinação
                </button>
              )}
            </div>
          );
        })}
      </div>

      {sendError && <p className="text-xs text-red-500">{sendError}</p>}
      {generateError && <p className="text-xs text-red-500">{generateError}</p>}

      {canManage && !isClosed && (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Descreva o lançamento, responda dúvidas da IA..." disabled={sending} className="text-sm flex-1" />
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" className="h-9 w-9 p-0" disabled={uploading} onClick={() => fileInputRef.current?.click()} title="Anexar arquivo">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Button size="sm" className="h-9 btn-brand border-0" disabled={sending || !draft.trim()} onClick={() => void handleSend()} title="Enviar mensagem">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {pendingExecutionId ? (
              <>
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando plano tático...
                </span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void handleCancelGeneration()}>
                  Cancelar geração
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void handleGenerate()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gerar plano tático
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Proposta atual / versão em visualização */}
      {versionInfo && (
        <LaunchPlanView
          version={versionInfo.version}
          plan={versionInfo.plan}
          canManage={canManage && !isClosed}
          onEdit={() => setEditingPlan(versionInfo.plan)}
        />
      )}

      {/* Histórico de versões */}
      {session.versions.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <button type="button" className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-300" onClick={() => setHistoryOpen((o) => !o)}>
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Versões da proposta ({session.versions.length})
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {historyOpen && (
            <ul className="mt-2 space-y-1">
              {session.versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={`text-xs w-full text-left px-2 py-1 rounded ${viewingVersionId === v.id || (!viewingVersionId && v.id === session.current_version_id) ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700" : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"}`}
                    onClick={() => setViewingVersionId(v.id === session.current_version_id ? null : v.id)}
                  >
                    v{v.version_number} — {v.source === "ia_gerada" ? "gerada pela IA" : "editada por humano"}
                    {v.id === session.approved_version_id && " (aprovada)"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editingPlan && <LaunchPlanEditor plan={editingPlan} onCancel={() => setEditingPlan(null)} onSubmit={(p) => void handleSubmitEdit(p)} />}

      {reportDialog && (
        <HallucinationReportDialog
          open
          onClose={() => setReportDialog(null)}
          projectId={projectId}
          snapshotId={reportDialog.snapshotId}
          launchExecutionId={reportDialog.executionId}
          onSubmitted={() => setReportDialog(null)}
        />
      )}

      <ConfirmationDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => void handleCancelSession()}
        title="Cancelar sessão de lançamento?"
        message="A conversa e as versões ficam guardadas, mas a sessão não aceita mais alterações."
        confirmText="Cancelar sessão"
        destructive
      />
      <ConfirmationDialog
        open={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={() => void handleApprove()}
        title="Aprovar como rascunho de lançamento?"
        message="Isto marca o plano como revisado e pronto — nenhuma tarefa é criada agora. A materialização real acontece em outra etapa."
        confirmText="Aprovar como rascunho"
      />
    </div>
  );
}

function LaunchPlanView({ version, plan, canManage, onEdit }: { version: LaunchVersionDto; plan: LaunchPlan; canManage: boolean; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Plano tático (v{version.version_number})</h4>
        {canManage && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">{plan.plan_summary}</p>
      {(plan.plan_duration_months || plan.plan_duration_days_custom) && (
        <p className="text-[11px] text-slate-400">Duração: {plan.plan_duration_months ? `${plan.plan_duration_months} meses` : `${plan.plan_duration_days_custom} dias (personalizado)`}</p>
      )}

      {plan.waves.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Ondas</p>
          {plan.waves.map((w, i) => (
            <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 p-2 text-xs">
              <p className="font-medium text-slate-700 dark:text-slate-200">{w.name}</p>
              <p className="text-slate-500">{w.objective}</p>
              <p className="text-slate-400 mt-1">Gatilho: {TRIGGER_LABEL[w.trigger_type]}{w.trigger_date ? ` — ${w.trigger_date}` : ""}{w.trigger_note ? ` (${w.trigger_note})` : ""}</p>
              <p className="text-slate-400">Tarefas: {w.task_titles.join(", ")}</p>
            </div>
          ))}
        </div>
      )}

      {plan.tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Tarefas propostas ({plan.tasks.length})</p>
          {plan.tasks.map((t, i) => (
            <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 p-2 text-xs space-y-0.5">
              <p className="font-medium text-slate-700 dark:text-slate-200">{t.title}</p>
              <p className="text-slate-500">{t.objective}</p>
              <p className="text-slate-400">Entregável: {t.deliverable} — {t.suggested_duration_days} dia(s) — especialidade: {t.required_specialty}</p>
              {t.responsible_user_id && <p className="text-slate-400">Responsável: {t.responsible_user_id}</p>}
              {t.open_questions.length > 0 && (
                <p className="text-amber-600">Dúvidas: {t.open_questions.join("; ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LaunchPlanEditor({ plan, onCancel, onSubmit }: { plan: LaunchPlan; onCancel: () => void; onSubmit: (plan: LaunchPlan) => void }) {
  const [draft, setDraft] = useState<LaunchPlan>(() => JSON.parse(JSON.stringify(plan)));

  function updateTask(index: number, patch: Partial<LaunchTask>) {
    setDraft((d) => ({ ...d, tasks: d.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }
  function moveTask(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const tasks = [...d.tasks];
      const target = index + dir;
      if (target < 0 || target >= tasks.length) return d;
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
      return { ...d, tasks };
    });
  }
  function removeTask(index: number) {
    setDraft((d) => ({ ...d, tasks: d.tasks.filter((_, i) => i !== index) }));
  }
  function addTask() {
    setDraft((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        { title: "Nova tarefa", objective: "", description: "", deliverable: "", steps: [""], suggested_duration_days: 1, required_specialty: "", prerequisites: [], approval_criteria: [""], references: [], justification: "Adicionada manualmente na revisão humana.", open_questions: [] },
      ],
    }));
  }

  return (
    <div className="rounded-xl border-2 border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Editando plano (revisão humana)</h4>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Textarea value={draft.plan_summary} onChange={(e) => setDraft((d) => ({ ...d, plan_summary: e.target.value }))} rows={2} className="text-xs" placeholder="Resumo do plano" />

      <div className="space-y-2">
        {draft.tasks.map((t, i) => (
          <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Input value={t.title} onChange={(e) => updateTask(i, { title: e.target.value })} className="h-7 text-xs flex-1" />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === 0} onClick={() => moveTask(i, -1)}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === draft.tasks.length - 1} onClick={() => moveTask(i, 1)}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeTask(i)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
            <Input value={t.required_specialty} onChange={(e) => updateTask(i, { required_specialty: e.target.value })} className="h-7 text-xs" placeholder="Especialidade necessária" />
            <Input type="number" min={1} value={t.suggested_duration_days} onChange={(e) => updateTask(i, { suggested_duration_days: Number(e.target.value) || 1 })} className="h-7 text-xs w-32" placeholder="Dias" />
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addTask}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tarefa
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs btn-brand border-0" onClick={() => onSubmit(draft)}>
          Salvar como nova versão
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
          Descartar edição
        </Button>
      </div>
    </div>
  );
}
