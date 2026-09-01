/**
 * Painel de "Memória" reutilizável — Projeto, Company e Agência (sprint
 * Memória e Automação por IA, bloco 1/4). Só armazenamento/edição/histórico
 * aqui; nenhuma montagem de prompt ou chamada de IA acontece neste bloco.
 *
 * Edição sempre POR SEÇÃO (nunca um textarea gigante só): cada seção tem seu
 * próprio estado de edição/loading/erro, então salvar uma nunca recarrega a
 * tela nem mexe nas outras. Concorrência otimista — se outra pessoa salvou
 * a mesma seção entre a leitura e o salvamento, o backend responde 409 e o
 * erro aparece dentro da própria seção, sem perder o rascunho do usuário.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, X, FileText, History, CheckCircle2, Paperclip, Trash2, ChevronDown, ChevronUp, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiClient, ApiError } from "@/lib/api-client";

export type MemoryScopeType = "project" | "company" | "agency";

type MemorySectionKey = "summary" | "positive_instructions" | "negative_instructions";

interface MemoryFileDto {
  id: string;
  name: string;
  size: number;
  mime_type: string | null;
  created_at: string;
}

interface MemoryApprovedTaskRecordDto {
  id: string;
  project_task_id: string;
  approved_at: string;
  approval_note: string | null;
  project_task?: { title: string } | null;
}

interface MemoryDto {
  id: string | null;
  positive_instructions: string | null;
  negative_instructions: string | null;
  summary: string | null;
  is_archived: boolean;
  updated_at: string | null;
  files: MemoryFileDto[];
  approved_task_records?: MemoryApprovedTaskRecordDto[];
}

interface MemoryHistoryEventDto {
  id: string;
  section: string;
  action: string;
  actor_user_id: string;
  reason: string | null;
  created_at: string;
}

const SECTION_LABELS: Record<MemorySectionKey, string> = {
  summary: "Resumo",
  positive_instructions: "O que a IA deve fazer",
  negative_instructions: "O que a IA deve evitar",
};

const SECTION_PLACEHOLDERS: Record<MemorySectionKey, string> = {
  summary: "Resumo consolidado — o essencial pra qualquer pessoa nova entender o contexto rapidamente.",
  positive_instructions: "Ex.: sempre usar linguagem informal, priorizar tom direto, seguir a paleta de cores X...",
  negative_instructions: "Ex.: nunca usar emojis, nunca mencionar concorrentes pelo nome...",
};

const ACTION_LABELS: Record<string, string> = {
  created: "memória criada",
  updated: "seção atualizada",
  archived: "arquivada",
  unarchived: "reaberta",
  file_added: "arquivo anexado",
  file_removed: "arquivo removido",
  approved_task_added: "tarefa aprovada registrada",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface MemoryPanelProps {
  scopeType: MemoryScopeType;
  scopeId: string;
  /** Esconde as seções que não fazem sentido fora do projeto (arquivos/tarefas aprovadas), pra uma seção mínima em Company/Agência. */
  compact?: boolean;
}

export function MemoryPanel({ scopeType, scopeId, compact }: MemoryPanelProps) {
  const { toast } = useToast();
  const [memory, setMemory] = useState<MemoryDto | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingSection, setEditingSection] = useState<MemorySectionKey | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingSection, setSavingSection] = useState<MemorySectionKey | null>(null);
  const [sectionError, setSectionError] = useState<Partial<Record<MemorySectionKey, string>>>({});
  const [discardConfirmSection, setDiscardConfirmSection] = useState<MemorySectionKey | null>(null);

  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MemoryHistoryEventDto[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.getMemory(scopeType, scopeId);
      setMemory(res.memory);
      setCanEdit(Boolean(res.can_edit));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar a memória agora.");
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(section: MemorySectionKey, currentValue: string | null) {
    setEditingSection(section);
    setDraftValue(currentValue ?? "");
    setSectionError((prev) => ({ ...prev, [section]: undefined }));
  }

  function requestCancelEdit(section: MemorySectionKey, currentValue: string | null) {
    if (draftValue !== (currentValue ?? "")) {
      setDiscardConfirmSection(section);
    } else {
      setEditingSection(null);
    }
  }

  async function saveSection(section: MemorySectionKey) {
    setSavingSection(section);
    setSectionError((prev) => ({ ...prev, [section]: undefined }));
    try {
      const res = await apiClient.updateMemorySection(scopeType, scopeId, section, draftValue, memory?.updated_at ?? null);
      setMemory((prev) => (prev ? { ...prev, ...res.memory } : res.memory));
      setEditingSection(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSectionError((prev) => ({
          ...prev,
          [section]: "Essa seção foi alterada por outra pessoa enquanto você editava. Recarregue a memória antes de salvar de novo, pra não perder a versão dela.",
        }));
      } else {
        setSectionError((prev) => ({ ...prev, [section]: err instanceof ApiError ? err.message : "Não foi possível salvar agora." }));
      }
    } finally {
      setSavingSection(null);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setFileError(null);
    try {
      await apiClient.uploadMemoryFile(scopeType, scopeId, file);
      await load();
    } catch (err) {
      setFileError(err instanceof ApiError ? err.message : "Não foi possível enviar o arquivo agora.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId);
    try {
      await apiClient.deleteMemoryFile(scopeType, scopeId, fileId);
      await load();
    } catch {
      toast({ title: "Memória", description: "Não foi possível remover o arquivo agora.", variant: "destructive" });
    } finally {
      setDeletingFileId(null);
    }
  }

  async function handleDownload(fileId: string, name: string) {
    try {
      const blob = await apiClient.downloadMemoryFile(scopeType, scopeId, fileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Memória", description: "Não foi possível baixar o arquivo agora.", variant: "destructive" });
    }
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history === null) {
      setHistoryLoading(true);
      try {
        const res = await apiClient.getMemoryHistory(scopeType, scopeId);
        setHistory(res.history);
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  function renderSection(section: MemorySectionKey) {
    const value = memory ? memory[section] : null;
    const isEditing = editingSection === section;
    const isSaving = savingSection === section;
    const err = sectionError[section];

    return (
      <div key={section} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{SECTION_LABELS[section]}</h4>
          {canEdit && !isEditing && (
            <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => startEdit(section, value)}>
              Editar
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              rows={4}
              placeholder={SECTION_PLACEHOLDERS[section]}
              disabled={isSaving}
              className="text-sm"
            />
            {err && <p className="text-xs text-red-500 dark:text-red-400">{err}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs btn-brand border-0 gap-1" disabled={isSaving} onClick={() => void saveSection(section)}>
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={isSaving} onClick={() => requestCancelEdit(section, value)}>
                <X className="h-3 w-3" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : value ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{value}</p>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {canEdit ? "Nada registrado ainda — clique em Editar pra adicionar." : "Nada registrado ainda."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memory?.is_archived && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <Archive className="h-3.5 w-3.5 shrink-0" />
          Esta memória está arquivada.
        </div>
      )}

      {renderSection("summary")}
      {renderSection("positive_instructions")}
      {renderSection("negative_instructions")}

      {!compact && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Arquivos de referência
              </h4>
              {canEdit && (
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                    Anexar
                  </span>
                </label>
              )}
            </div>
            {fileError && <p className="text-xs text-red-500 dark:text-red-400">{fileError}</p>}
            {!memory?.files.length ? (
              <p className="text-xs text-slate-400 italic">Nenhum arquivo anexado ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {memory.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-700 px-2.5 py-1.5">
                    <button type="button" onClick={() => void handleDownload(f.id, f.name)} className="flex items-center gap-1.5 min-w-0 text-left hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(f.size)}</span>
                    </button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        disabled={deletingFileId === f.id}
                        onClick={() => void handleDeleteFile(f.id)}
                      >
                        {deletingFileId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-red-400" />}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprendizados de tarefas aprovadas
            </h4>
            {!memory?.approved_task_records?.length ? (
              <p className="text-xs text-slate-400 italic">Nenhuma tarefa aprovada registrada ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {memory.approved_task_records.map((r) => (
                  <li key={r.id} className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">{r.project_task?.title ?? "Tarefa"}</span> — aprovada em{" "}
                    {new Date(r.approved_at).toLocaleString("pt-BR")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
        <button type="button" className="flex items-center justify-between w-full" onClick={() => void toggleHistory()}>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Histórico de alterações
          </h4>
          {historyOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {historyOpen &&
          (historyLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : !history?.length ? (
            <p className="text-xs text-slate-400 italic">Nenhuma alteração registrada ainda.</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-600 pl-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {SECTION_LABELS[h.section as MemorySectionKey] ?? h.section}
                  </span>{" "}
                  — {ACTION_LABELS[h.action] ?? h.action} — {new Date(h.created_at).toLocaleString("pt-BR")}
                </li>
              ))}
            </ul>
          ))}
      </div>

      <ConfirmationDialog
        open={discardConfirmSection !== null}
        onClose={() => setDiscardConfirmSection(null)}
        onConfirm={() => {
          setEditingSection(null);
          setDiscardConfirmSection(null);
        }}
        title="Descartar alterações?"
        message="Você tem alterações não salvas nesta seção. Se sair agora, elas serão perdidas."
        confirmText="Descartar"
        destructive
      />
    </div>
  );
}
