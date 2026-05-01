// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Clock,
  SendHorizonal,
  MessageSquare,
  ArrowRight,
  PlayCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Paperclip,
  Link2,
  Trash2,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Wand2,
  Package,
  UserSearch,
} from "lucide-react";

// ─── Local status config (mirrors project-view-slide-panel.tsx) ───────────────
const TASK_STATUS_CFG: Record<
  string,
  { label: string; cls: string; icon: any }
> = {
  PARA_LANCAMENTO: {
    label: "Para lançamento",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    icon: Clock,
  },
  EM_LANCAMENTO: {
    label: "Em lançamento",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: SendHorizonal,
  },
  AGUARDANDO_INFORMACOES: {
    label: "Ag. Informações",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    icon: MessageSquare,
  },
  LIBERADA_PARA_EXECUCAO: {
    label: "Liberada p/ Exec.",
    cls: "bg-cyan-100 text-cyan-700 border-cyan-200",
    icon: ArrowRight,
  },
  EM_EXECUCAO: {
    label: "Em execução",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    icon: PlayCircle,
  },
  EM_REVISAO: {
    label: "Em revisão",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Eye,
  },
  EM_APROVACAO: {
    label: "Em aprovação",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    icon: CheckCircle2,
  },
  CONCLUIDA: {
    label: "Concluída",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-red-100 text-red-600 border-red-200",
    icon: XCircle,
  },
  AGUARDANDO_NOMADE: {
    label: "Ag. Nômade",
    cls: "bg-purple-100 text-purple-700 border-purple-200",
    icon: UserSearch,
  },
};

// ─── Sub-component: StatusBadge (white-tinted variant for dark backgrounds) ───
function TaskStatusBadge({
  status,
  onDark = false,
}: {
  status: string;
  onDark?: boolean;
}) {
  const cfg = TASK_STATUS_CFG[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Clock,
  };
  const Icon = cfg.icon;
  if (onDark) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-white/20 text-white border-white/30 whitespace-nowrap">
        <Icon className="h-3 w-3 shrink-0" />
        {cfg.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap",
        cfg.cls,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tryParseJson(data: any): any[] {
  if (!data) return [];
  try {
    const p = typeof data === "string" ? JSON.parse(data) : data;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function getQuestionKey(q: any, idx: number): string {
  return q.question_key ?? q.id ?? `q_${idx}`;
}

function fmtBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface TaskLaunchDrawerProps {
  task: any;
  onClose: () => void;
  onReleased: (taskId: string) => void;
  onTaskUpdated?: (task: any) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TaskLaunchDrawer({
  task,
  onClose,
  onReleased,
  onTaskUpdated,
}: TaskLaunchDrawerProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [initializing, setInitializing] = useState(true);
  const [currentTask, setCurrentTask] = useState<any>(task);
  const [briefingQuestions, setBriefingQuestions] = useState<any[]>([]);
  // answers: { [question_key]: { answer?: string; selected_options?: string[]; links?: string[] } }
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Initialize ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setInitializing(true);
      try {
        let taskToUse = task;

        // 1. Auto-launch if still in PARA_LANCAMENTO
        if (task.status === "PARA_LANCAMENTO") {
          try {
            await apiClient.launchProjectTask(task.id);
            taskToUse = {
              ...task,
              status: "EM_LANCAMENTO",
              data_lancamento: new Date().toISOString(),
            };
            if (!cancelled) {
              setCurrentTask(taskToUse);
              onTaskUpdated?.(taskToUse);
            }
          } catch {
            // Already launched in a race — continue with current status
          }
        }

        // 2. Parse briefing questions from snapshot
        const rawBriefing =
          taskToUse.briefing_snapshot ?? task.briefing_snapshot;
        const questions = tryParseJson(rawBriefing);
        if (!cancelled) setBriefingQuestions(questions);

        // 3. Load existing answers
        try {
          const briefingRes = await apiClient.getProjectTaskBriefing(task.id);
          const existingAnswers: any[] = briefingRes?.answers ?? [];
          const answersMap: Record<string, any> = {};
          for (const ans of existingAnswers) {
            answersMap[ans.question_key] = {
              answer: ans.answer ?? "",
              selected_options: tryParseJson(ans.files), // briefing "files" field stores MC choices
              links: tryParseJson(ans.links),
            };
          }
          if (!cancelled) setAnswers(answersMap);
        } catch {}

        // 4. Load existing attachments
        try {
          const attachRes = await apiClient.getProjectTaskAttachments(task.id);
          if (!cancelled) setAttachments(attachRes?.data ?? []);
        } catch {}
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Answer helpers ─────────────────────────────────────────────────────────
  function setAnswer(
    key: string,
    patch: Partial<{
      answer: string;
      selected_options: string[];
      links: string[];
    }>,
  ) {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), ...patch },
    }));
    setDraftSavedAt(null);
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const missingRequired = briefingQuestions.filter((q, idx) => {
    if (!q.required) return false;
    const key = getQuestionKey(q, idx);
    const a = answers[key];
    if (!a) return true;
    if (q.type === "multiple_choice") return !(a.selected_options?.length > 0);
    if (q.type === "select") return !a.answer;
    return !a.answer?.trim();
  });

  const canRelease = missingRequired.length === 0;
  const requiredCount = briefingQuestions.filter((q) => q.required).length;
  const answeredCount = requiredCount - missingRequired.length;
  const progressPct =
    requiredCount > 0 ? Math.round((answeredCount / requiredCount) * 100) : 100;

  const fileAttachments = attachments.filter((a) => a.type === "file");
  const linkAttachments = attachments.filter((a) => a.type === "link");

  // ── API payload builder ────────────────────────────────────────────────────
  function buildAnswersPayload() {
    return briefingQuestions.map((q, idx) => {
      const key = getQuestionKey(q, idx);
      const a = answers[key] ?? {};
      let answerText = "";
      if (q.type === "multiple_choice") {
        answerText = (a.selected_options ?? []).join(", ");
      } else {
        answerText = a.answer ?? "";
      }
      return {
        question_key: key,
        question_text: q.question_text ?? q.label ?? `Pergunta ${idx + 1}`,
        answer: answerText,
        ...(q.type === "link" && a.links?.length
          ? { links: JSON.stringify(a.links) }
          : {}),
      };
    });
  }

  // ── Save draft ─────────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await apiClient.saveProjectTaskBriefing(task.id, {
        answers: buildAnswersPayload(),
      });
      setDraftSavedAt(new Date());
    } catch {
      // Silent — user can retry
    } finally {
      setSavingDraft(false);
    }
  }

  // ── Release ────────────────────────────────────────────────────────────────
  async function handleRelease() {
    if (!canRelease || releasing) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      await apiClient.saveProjectTaskBriefing(task.id, {
        answers: buildAnswersPayload(),
      });
      await apiClient.releaseProjectTask(task.id);
      onReleased(task.id);
    } catch (e: any) {
      setReleaseError(e?.message ?? "Erro ao liberar tarefa. Tente novamente.");
    } finally {
      setReleasing(false);
    }
  }

  // ── File upload ────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      try {
        const attachment = await apiClient.addProjectTaskAttachment(task.id, {
          type: "file",
          name: file.name,
          url: "#",
          size: file.size,
          mime_type: file.type,
        });
        setAttachments((prev) => [...prev, attachment]);
      } catch {}
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Add link ───────────────────────────────────────────────────────────────
  async function handleAddLink() {
    if (!newLinkUrl.trim()) return;
    try {
      const attachment = await apiClient.addProjectTaskAttachment(task.id, {
        type: "link",
        name: newLinkName.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim(),
      });
      setAttachments((prev) => [...prev, attachment]);
      setNewLinkName("");
      setNewLinkUrl("");
    } catch {}
  }

  // ── Remove attachment ──────────────────────────────────────────────────────
  async function handleRemoveAttachment(attachmentId: string) {
    try {
      await apiClient.deleteProjectTaskAttachment(task.id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {}
  }

  // ── Render: Briefing question ──────────────────────────────────────────────
  function renderQuestion(q: any, idx: number) {
    const key = getQuestionKey(q, idx);
    const label = q.question_text ?? q.label ?? `Pergunta ${idx + 1}`;
    const a = answers[key] ?? {};
    const isMissing =
      q.required &&
      missingRequired.some((mq, i) => getQuestionKey(mq, i) === key);

    return (
      <div
        key={key}
        className={cn(
          "rounded-xl border bg-white p-4 space-y-3 transition-colors",
          isMissing ? "border-red-200 bg-red-50/20" : "border-slate-200",
        )}
      >
        {/* Question label */}
        <div className="flex items-start justify-between gap-2">
          <Label className="text-sm font-semibold text-slate-700 leading-snug">
            {label}
            {q.required && (
              <span className="text-red-500 ml-1" aria-label="obrigatório">
                *
              </span>
            )}
          </Label>
          {q.type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 font-mono uppercase shrink-0">
              {q.type.replace("_", " ")}
            </span>
          )}
        </div>

        {q.description && (
          <p className="text-xs text-slate-500">{q.description}</p>
        )}

        {/* ── text_short (default) ── */}
        {(q.type === "text_short" || !q.type) && (
          <Input
            placeholder="Sua resposta..."
            value={a.answer ?? ""}
            onChange={(e) => setAnswer(key, { answer: e.target.value })}
            className={cn(
              "text-sm",
              isMissing && !a.answer?.trim() && "border-red-300",
            )}
          />
        )}

        {/* ── text_long ── */}
        {q.type === "text_long" && (
          <Textarea
            placeholder="Descreva em detalhes..."
            value={a.answer ?? ""}
            onChange={(e) => setAnswer(key, { answer: e.target.value })}
            rows={4}
            className={cn(
              "text-sm resize-none",
              isMissing && !a.answer?.trim() && "border-red-300",
            )}
          />
        )}

        {/* ── select ── */}
        {q.type === "select" && (
          <Select
            value={a.answer ?? ""}
            onValueChange={(val) => setAnswer(key, { answer: val })}
          >
            <SelectTrigger
              className={cn(
                "text-sm",
                isMissing && !a.answer && "border-red-300",
              )}
            >
              <SelectValue placeholder="Selecione uma opção..." />
            </SelectTrigger>
            <SelectContent>
              {(q.options ?? []).map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* ── multiple_choice ── */}
        {q.type === "multiple_choice" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt: string) => {
              const selected = (a.selected_options ?? []).includes(opt);
              return (
                <div key={opt} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`${key}_${opt}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current: string[] = a.selected_options ?? [];
                      setAnswer(key, {
                        selected_options: checked
                          ? [...current, opt]
                          : current.filter((o) => o !== opt),
                      });
                    }}
                  />
                  <Label
                    htmlFor={`${key}_${opt}`}
                    className="text-sm cursor-pointer"
                  >
                    {opt}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {/* ── file ── */}
        {q.type === "file" && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">
              Envie os arquivos relacionados a esta pergunta na seção{" "}
              <span className="font-semibold text-indigo-600">Anexos</span>{" "}
              abaixo.
            </p>
          </div>
        )}

        {/* ── link ── */}
        {q.type === "link" && (
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={a.answer ?? ""}
              onChange={(e) => setAnswer(key, { answer: e.target.value })}
              type="url"
              className={cn(
                "text-sm",
                isMissing && !a.answer?.trim() && "border-red-300",
              )}
            />
            {a.answer?.trim() && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                asChild
              >
                <a href={a.answer} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Validation hint */}
        {isMissing && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Campo obrigatório — preencha antes de liberar
          </p>
        )}
      </div>
    );
  }

  // ── Render: Attachment row ─────────────────────────────────────────────────
  function renderAttachment(att: any) {
    const isLink = att.type === "link";
    return (
      <div
        key={att.id}
        className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg border border-slate-200 group"
      >
        <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
          {isLink ? (
            <Link2 className="h-4 w-4 text-indigo-500" />
          ) : (
            <FileText className="h-4 w-4 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">
            {att.name}
          </p>
          {!isLink && att.size ? (
            <p className="text-xs text-slate-400">{fmtBytes(att.size)}</p>
          ) : null}
          {isLink && att.url && att.url !== "#" && (
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:underline truncate block"
            >
              {att.url}
            </a>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
          onClick={() => handleRemoveAttachment(att.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ── Checklist items ────────────────────────────────────────────────────────
  const checklistItems = [
    {
      key: "briefing",
      label:
        briefingQuestions.length === 0
          ? "Sem perguntas de briefing configuradas"
          : `Briefing preenchido (${answeredCount}/${requiredCount} obrigatórios)`,
      done: canRelease,
      required: requiredCount > 0,
    },
    {
      key: "files",
      label: `Arquivos anexados${fileAttachments.length > 0 ? ` (${fileAttachments.length})` : ""}`,
      done: fileAttachments.length > 0,
      required: false,
    },
    {
      key: "links",
      label: `Links adicionados${linkAttachments.length > 0 ? ` (${linkAttachments.length})` : ""}`,
      done: linkAttachments.length > 0,
      required: false,
    },
    {
      key: "observations",
      label: "Observações revisadas",
      done: false,
      required: false,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col h-full gap-0"
      >
        {initializing ? (
          /* Loading state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">Preparando lançamento…</p>
          </div>
        ) : (
          <>
            {/* ════════════════ HEADER ════════════════ */}
            <div className="bg-linear-to-br from-indigo-600 to-indigo-800 text-white px-6 pt-5 pb-5 shrink-0 pr-14">
              {/* Status badge */}
              <div className="mb-3">
                <TaskStatusBadge status={currentTask.status} onDark />
              </div>

              {/* Task title */}
              <h2 className="text-xl font-bold text-white leading-tight mb-1">
                {currentTask.title}
              </h2>

              {/* Product ref */}
              {(currentTask.project_product?.product_code_snapshot ||
                currentTask.project_product?.product_name_snapshot) && (
                <p className="text-indigo-200 text-sm mb-4 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  {currentTask.project_product?.product_code_snapshot && (
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-xs">
                      {currentTask.project_product.product_code_snapshot}
                    </span>
                  )}
                  {currentTask.project_product?.product_name_snapshot}
                </p>
              )}

              {/* 3-col grid: Projeto | Cliente | Prazo */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-0.5">
                    Projeto
                  </p>
                  <p className="text-white text-sm font-medium truncate">
                    {currentTask.project?.title ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-0.5">
                    Cliente
                  </p>
                  <p className="text-white text-sm font-medium truncate">
                    {currentTask.project?.client?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-0.5">
                    Prazo
                  </p>
                  <p className="text-white text-sm font-medium">
                    {currentTask.due_date
                      ? new Date(currentTask.due_date).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Briefing progress bar */}
              {requiredCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-indigo-200 text-xs">
                      Briefing obrigatório
                    </span>
                    <span className="text-white text-xs font-semibold">
                      {answeredCount}/{requiredCount}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════ SCROLLABLE CONTENT ════════════════ */}
            <div className="flex-1 overflow-y-auto bg-slate-50/60">
              <div className="px-6 py-6 space-y-8">
                {/* ── Section 1: Briefing ── */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Briefing
                    </h3>
                    {requiredCount > 0 && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                          canRelease
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-orange-50 text-orange-600 border-orange-200",
                        )}
                      >
                        {answeredCount}/{requiredCount} obrigatórios
                      </span>
                    )}
                  </div>

                  {briefingQuestions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">
                        Nenhuma pergunta configurada
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Este modelo de tarefa não possui briefing obrigatório.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {briefingQuestions.map((q, idx) =>
                        renderQuestion(q, idx),
                      )}
                    </div>
                  )}
                </section>

                {/* ── Section 2: AI Help (collapsible) ── */}
                <section>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl border border-indigo-200 bg-white px-4 py-3 hover:bg-indigo-50/40 transition-colors"
                    onClick={() => setAiExpanded((p) => !p)}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-700">
                        Ajuda com IA
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                        em breve
                      </span>
                    </div>
                    {aiExpanded ? (
                      <ChevronUp className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-indigo-400" />
                    )}
                  </button>

                  {aiExpanded && (
                    <div className="mt-2 rounded-xl border border-indigo-100 bg-white p-4">
                      <p className="text-xs text-slate-500 mb-4">
                        A IA da Allka vai sugerir respostas, melhorar seu
                        briefing e analisar os anexos automaticamente.
                        Disponível em breve.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            label: "Sugerir resposta com IA",
                            Icon: Sparkles,
                          },
                          { label: "Melhorar briefing com IA", Icon: Wand2 },
                          {
                            label: "Analisar anexos com IA",
                            Icon: Paperclip,
                          },
                        ].map(({ label, Icon }) => (
                          <Button
                            key={label}
                            variant="outline"
                            size="sm"
                            disabled
                            className="h-9 text-xs gap-1.5 border-indigo-200 text-indigo-400 opacity-60"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* ── Section 3: Anexos ── */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Paperclip className="h-4 w-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Anexos
                    </h3>
                    {attachments.length > 0 && (
                      <span className="text-xs text-slate-400">
                        {attachments.length}{" "}
                        {attachments.length === 1 ? "item" : "itens"}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-5">
                    {/* File upload zone */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Arquivos
                      </p>
                      <label className="block cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.sketch,.fig"
                        />
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                          <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-indigo-600">
                              Clique para selecionar
                            </span>{" "}
                            ou arraste arquivos aqui
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Imagens, PDFs, documentos, planilhas, apresentações
                          </p>
                        </div>
                      </label>
                    </div>

                    <Separator />

                    {/* Link input */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Links e referências
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome (ex: Referência visual)"
                          value={newLinkName}
                          onChange={(e) => setNewLinkName(e.target.value)}
                          className="text-sm h-9 flex-1"
                        />
                        <Input
                          placeholder="https://..."
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddLink();
                          }}
                          type="url"
                          className="text-sm h-9 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 shrink-0"
                          onClick={handleAddLink}
                          disabled={!newLinkUrl.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Attachments list */}
                    {attachments.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-100">
                        {attachments.map((att) => renderAttachment(att))}
                      </div>
                    )}
                  </div>
                </section>

                {/* ── Section 4: Checklist de liberação ── */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="h-4 w-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Checklist de liberação
                    </h3>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {checklistItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                              item.required
                                ? "border-red-300 bg-red-50"
                                : "border-slate-300 bg-white",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "text-sm flex-1",
                            item.done
                              ? "text-emerald-700"
                              : item.required
                                ? "text-red-600 font-medium"
                                : "text-slate-500",
                          )}
                        >
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-semibold border",
                            item.required
                              ? "bg-red-50 text-red-500 border-red-200"
                              : "bg-slate-50 text-slate-400 border-slate-200",
                          )}
                        >
                          {item.required ? "obrigatório" : "opcional"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Bottom padding */}
                <div className="h-2" />
              </div>
            </div>

            {/* ════════════════ FOOTER ════════════════ */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
              {/* Release error */}
              {releaseError && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{releaseError}</p>
                </div>
              )}

              {/* Validation warning */}
              {!canRelease && missingRequired.length > 0 && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Responda{" "}
                    {missingRequired.length === 1
                      ? "a pergunta obrigatória"
                      : `as ${missingRequired.length} perguntas obrigatórias`}{" "}
                    do briefing antes de liberar.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                {/* Left: cancel */}
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-slate-600"
                >
                  Cancelar
                </Button>

                {/* Right: save draft + release */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="gap-1.5"
                  >
                    {savingDraft ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : draftSavedAt ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : null}
                    {draftSavedAt ? "Rascunho salvo" : "Salvar rascunho"}
                  </Button>

                  <Button
                    onClick={handleRelease}
                    disabled={!canRelease || releasing}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                  >
                    {releasing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    Liberar para execução
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
