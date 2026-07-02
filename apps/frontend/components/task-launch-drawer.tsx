// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
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
  ClipboardList,
  Pencil,
  RotateCcw,
  Send,
  ArrowLeft,
  Info,
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
  LANCAMENTO_ENVIADO_PARA_ANALISE: {
    label: "Enviado p/ Análise",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    icon: Send,
  },
  DEVOLVIDA_PARA_AGENCIA: {
    label: "Correção Solicitada",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    icon: RotateCcw,
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
  // ── Sidebar width for full-height panel positioning ────────────────────────
  const { sidebarWidth } = useSidebar();

  // ── State ──────────────────────────────────────────────────────────────────
  const [initializing, setInitializing] = useState(true);
  const [currentTask, setCurrentTask] = useState<any>(task);
  const [briefingQuestions, setBriefingQuestions] = useState<any[]>([]);
  // fillMode: null = mode-selection screen, "manual" = questions, "ai" = assistant fill
  const [fillMode, setFillMode] = useState<null | "manual" | "ai">(null);
  // answers: { [question_key]: { answer?: string; selected_options?: string[]; links?: string[] } }
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI/Assistant fill state ────────────────────────────────────────────────
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMissingInfo, setAiMissingInfo] = useState<string[]>([]);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [aiFillSuccess, setAiFillSuccess] = useState(false);

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

        // 2. Load briefing questions from API (fallback to CatalogTask handled server-side)
        let questions: any[] = [];
        try {
          const briefingRes = await apiClient.getProjectTaskBriefing(task.id);
          questions = briefingRes?.briefing_questions ?? [];
          if (!cancelled) setBriefingQuestions(questions);

          // 3. Load existing answers
          const existingAnswers: any[] = briefingRes?.answers ?? [];
          const answersMap: Record<string, any> = {};
          for (const ans of existingAnswers) {
            answersMap[ans.question_key] = {
              answer: ans.answer ?? "",
              selected_options: tryParseJson(ans.files),
              links: tryParseJson(ans.links),
            };
          }
          if (!cancelled) {
            setAnswers(answersMap);
            // If answers already exist, go straight to manual mode
            if (existingAnswers.length > 0) setFillMode("manual");
          }
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
    if (briefingQuestions.length === 0) return;
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

  // ── Submit briefing for review ────────────────────────────────────────────
  async function handleSubmitBriefing() {
    if (!canRelease || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // If no questions, send an empty answers array so backend still transitions status
      const payload = briefingQuestions.length > 0
        ? buildAnswersPayload()
        : [{ question_key: "_no_briefing", question_text: "Sem briefing", answer: "" }];
      const updated = await apiClient.submitProjectTaskBriefing(task.id, {
        answers: payload,
      });
      onReleased(task.id);
      onTaskUpdated?.({ ...currentTask, status: "LANCAMENTO_ENVIADO_PARA_ANALISE" });
    } catch (e: any) {
      setSubmitError(e?.message ?? "Erro ao enviar briefing. Tente novamente.");
    } finally {
      setSubmitting(false);
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

  // ── Local smart text parser (no external AI service required) ────────────
  function parseFreetextToAnswers(freeText: string, questions: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    const text = freeText.trim();
    if (!text) return result;

    const sentences = text.split(/[.!?;\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 5);

    questions.forEach((q: any, idx: number) => {
      const key = getQuestionKey(q, idx);
      const label = (q.question_text ?? q.label ?? "").toLowerCase();
      const type = q.type ?? "text_short";

      // For select/multiple_choice: check if any option appears in the text first
      if (q.options?.length > 0 && Array.isArray(q.options)) {
        const optionMatch = q.options.find((opt: string) =>
          text.toLowerCase().includes(opt.toLowerCase())
        );
        if (optionMatch) {
          result[key] = optionMatch;
          return;
        }
      }

      // Keyword extraction from question label (words longer than 3 chars)
      const keywords = label.split(/\s+/).filter((w: string) => w.length > 3);

      // Score each sentence by how many keywords it contains
      let bestMatch = "";
      let bestScore = 0;
      for (const sentence of sentences) {
        const sentLower = sentence.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (sentLower.includes(kw)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = sentence;
        }
      }

      if (bestScore > 0) {
        result[key] = bestMatch;
      } else if (type === "textarea" || type === "text_long") {
        // Long text fields with no keyword match: use the full input
        result[key] = text;
      } else if (sentences.length > 0) {
        // Short text with no keyword match: use first sentence
        result[key] = sentences[0];
      }
    });

    return result;
  }

  // ── Handle AI/Assistant fill ────────────────────────────────────────────
  async function handleAIFill() {
    if (!aiText.trim() || briefingQuestions.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiFillSuccess(false);
    try {
      // Local parser — no external API needed
      const suggested = parseFreetextToAnswers(aiText, briefingQuestions);

      const newAnswers = { ...answers };
      const filledNow = new Set<string>();

      for (const [key, value] of Object.entries(suggested)) {
        if (value) {
          const alreadyHasAnswer = answers[key]?.answer?.trim() ||
            (answers[key]?.selected_options?.length > 0);
          if (!alreadyHasAnswer || overwriteExisting) {
            newAnswers[key] = {
              ...(newAnswers[key] ?? {}),
              answer: value,
              answeredAt: new Date().toISOString(),
            };
            filledNow.add(key);
          }
        }
      }

      setAnswers(newAnswers);
      setAiFilledFields(filledNow);
      setAiMissingInfo([]);
      setAiFillSuccess(true);
      // Switch to questionnaire view so user can review suggestions
      setFillMode("manual");
    } catch {
      setAiError("Não foi possível processar o briefing. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
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
          <div className="flex items-center flex-wrap gap-1.5">
            <Label className="text-sm font-semibold text-slate-700 leading-snug">
              {label}
              {q.required && (
                <span className="text-red-500 ml-1" aria-label="obrigatório">
                  *
                </span>
              )}
            </Label>
            {aiFilledFields.has(key) && (
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded font-medium border border-violet-200 whitespace-nowrap">
                <Wand2 className="h-2.5 w-2.5" />
                Sugerido automaticamente
              </span>
            )}
          </div>
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

  // ── Sub-render: Mode selection screen ────────────────────────────────────
  function renderModeSelection() {
    const isDevolvida = currentTask.status === "DEVOLVIDA_PARA_AGENCIA";
    return (
      <div className="px-6 py-8 space-y-6">
        {/* Feedback banner when task was returned by leader */}
        {isDevolvida && currentTask.observations && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex gap-3">
            <RotateCcw className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800 mb-1">Correção solicitada pelo líder</p>
              <p className="text-sm text-orange-700">{currentTask.observations}</p>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex gap-3">
          <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-700">
            Preencha o briefing para liberar esta tarefa para análise.
            {briefingQuestions.length > 0
              ? ` Esta tarefa possui ${briefingQuestions.length} pergunta${briefingQuestions.length > 1 ? "s" : ""} de briefing.`
              : ""}
          </p>
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Como deseja preencher?</p>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Manual */}
          <button
            onClick={() => setFillMode("manual")}
            className="text-left rounded-2xl border-2 border-slate-200 bg-white p-5 hover:border-indigo-400 hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Responder pergunta por pergunta</p>
            <p className="text-xs text-slate-500">Preencha manualmente cada pergunta do briefing.</p>
            {briefingQuestions.length > 0 && (
              <p className="text-xs text-indigo-600 mt-2 font-medium">
                {briefingQuestions.length} pergunta{briefingQuestions.length > 1 ? "s" : ""}
                {" · "}{briefingQuestions.filter((q) => q.required).length} obrigatória{briefingQuestions.filter((q) => q.required).length !== 1 ? "s" : ""}
              </p>
            )}
          </button>

          {/* Assistant fill */}
          <button
            onClick={() => setFillMode("ai")}
            className="text-left rounded-2xl border-2 border-slate-200 bg-white p-5 hover:border-violet-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3">
              <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold border border-violet-200">Novo</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
              <Wand2 className="h-5 w-5 text-violet-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Preencher com Assistente</p>
            <p className="text-xs text-slate-500">Cole o briefing do cliente e o assistente distribui nas perguntas automaticamente.</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Sub-render: Filling content (manual or AI) ─────────────────────────────
  function renderFillingContent() {
    if (fillMode === "ai") {
      return (
        <div className="px-6 py-8 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Wand2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Preencher com Assistente Automático</p>
              <p className="text-xs text-slate-500">Cole o briefing do cliente e o assistente vai distribuir nas perguntas.</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Assistente automático local.</span> As sugestões são geradas pelo dispositivo com base em palavras-chave — sem envio de dados para serviços externos. Revise as respostas antes de salvar.
            </p>
          </div>

          {/* Main textarea */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Texto livre com informações do cliente
            </Label>
            <Textarea
              placeholder="Cole aqui o briefing geral do cliente, mensagens do WhatsApp, anotações de reunião ou descreva o que precisa ser feito. O assistente vai organizar nos campos do questionário."
              rows={9}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="resize-none text-sm leading-relaxed"
            />
            <p className="text-[10px] text-slate-400">
              {aiText.trim().length} caracteres · {aiText.trim().split(/[.!?;\n]+/).filter((s) => s.trim().length > 5).length} frases detectadas
            </p>
          </div>

          {/* Overwrite checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="overwrite-existing"
              checked={overwriteExisting}
              onCheckedChange={(checked) => setOverwriteExisting(!!checked)}
            />
            <Label htmlFor="overwrite-existing" className="text-sm text-slate-600 cursor-pointer">
              Sobrescrever respostas já preenchidas
            </Label>
          </div>

          {/* Error state */}
          {aiError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{aiError}</p>
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={handleAIFill}
            disabled={aiLoading || !aiText.trim() || briefingQuestions.length === 0}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white w-full"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {aiLoading ? "Processando…" : "Organizar com Assistente"}
          </Button>

          {briefingQuestions.length === 0 && (
            <p className="text-xs text-slate-400 text-center">
              Esta tarefa não possui perguntas de briefing — o assistente não tem campos para preencher.
            </p>
          )}
        </div>
      );
    }

    // fillMode === "manual"
    return (
      <div className="px-6 py-6 space-y-8">
        {/* ── AI fill success banner ── */}
        {aiFillSuccess && aiFilledFields.size > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-start gap-3">
            <Wand2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-800">
                {aiFilledFields.size} {aiFilledFields.size === 1 ? "sugestão aplicada" : "sugestões aplicadas"} ao questionário
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                Revise os campos marcados com <span className="font-semibold">Sugerido automaticamente</span> antes de salvar.
              </p>
            </div>
            <button
              onClick={() => setAiFillSuccess(false)}
              className="h-6 w-6 rounded-md hover:bg-violet-200 flex items-center justify-center text-violet-500 shrink-0 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* ── Section 1: Briefing questions ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Briefing</h3>
            {requiredCount > 0 && (
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                canRelease ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-orange-50 text-orange-600 border-orange-200",
              )}>
                {answeredCount}/{requiredCount} obrigatórios
              </span>
            )}
          </div>

          {briefingQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Esta tarefa ainda não possui perguntas de briefing cadastradas.</p>
              <p className="text-xs text-slate-400">Você pode enviar o briefing mesmo assim, ou adicionar informações nos anexos abaixo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {briefingQuestions.map((q, idx) => renderQuestion(q, idx))}
            </div>
          )}
        </section>

        {/* ── Section 2: Anexos ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Anexos</h3>
            {attachments.length > 0 && (
              <span className="text-xs text-slate-400">{attachments.length} {attachments.length === 1 ? "item" : "itens"}</span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-5">
            {/* File upload */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Arquivos</p>
              <label className="block cursor-pointer">
                <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.sketch,.fig" />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                  <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-indigo-600">Clique para selecionar</span> ou arraste arquivos aqui
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Imagens, PDFs, documentos, planilhas</p>
                </div>
              </label>
            </div>

            <Separator />

            {/* Link input */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Links e referências</p>
              <div className="flex gap-2">
                <Input placeholder="Nome (ex: Referência visual)" value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)} className="text-sm h-9 flex-1" />
                <Input placeholder="https://..." value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                  type="url" className="text-sm h-9 flex-1" />
                <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={handleAddLink} disabled={!newLinkUrl.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                {attachments.map((att) => renderAttachment(att))}
              </div>
            )}
          </div>
        </section>
        <div className="h-2" />
      </div>
    );
  }

  // ── Sub-render: Footer ────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Validation warning */}
        {fillMode === "manual" && !canRelease && missingRequired.length > 0 && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Responda {missingRequired.length === 1 ? "a pergunta obrigatória" : `as ${missingRequired.length} perguntas obrigatórias`} do briefing antes de enviar.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-slate-600">Cancelar</Button>
            {fillMode !== null && (
              <Button variant="ghost" onClick={() => setFillMode(null)} className="gap-1.5 text-slate-500">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            )}
          </div>

          {/* Right */}
          {fillMode === null ? (
            // Mode selection — no actions
            <div />
          ) : (
            <div className="flex items-center gap-2">
              {fillMode === "manual" && (
                <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft || briefingQuestions.length === 0} className="gap-1.5">
                  {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : draftSavedAt ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                  {draftSavedAt ? "Rascunho salvo" : "Salvar rascunho"}
                </Button>
              )}
              <Button
                onClick={handleSubmitBriefing}
                disabled={submitting || fillMode === "ai" || (fillMode === "manual" && !canRelease)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Enviar briefing para análise
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const panelWidth = `calc(100vw - ${sidebarWidth}px)`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        style={{ left: `${sidebarWidth}px` }}
        onClick={onClose}
      />

      {/* Full-height side panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl overflow-hidden"
        style={{ left: `${sidebarWidth}px`, width: panelWidth }}
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
            <div
              className="px-6 pt-5 pb-5 shrink-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
              }}
            >
              {/* Top row: status badge + close button */}
              <div className="flex items-start justify-between mb-3">
                <TaskStatusBadge status={currentTask.status} onDark />
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
                  aria-label="Fechar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Task code + title */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {currentTask.task_code && (
                  <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-md font-bold tracking-wider">
                    {currentTask.task_code}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-tight mb-2">
                {currentTask.title}
              </h2>

              {/* Product ref */}
              {(currentTask.project_product?.product_code_snapshot ||
                currentTask.project_product?.product_name_snapshot) && (
                <p className="text-white/70 text-sm mb-4 flex items-center gap-1.5">
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
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Projeto</p>
                  <p className="text-white text-sm font-medium truncate">{currentTask.project?.title ?? "—"}</p>
                </div>
                <div>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Cliente</p>
                  <p className="text-white text-sm font-medium truncate">{currentTask.project?.client?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Prazo</p>
                  <p className="text-white text-sm font-medium">
                    {currentTask.due_date
                      ? new Date(currentTask.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Progress bar — only show when in manual mode */}
              {fillMode === "manual" && requiredCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-xs">Briefing obrigatório</span>
                    <span className="text-white text-xs font-semibold">{answeredCount}/{requiredCount}</span>
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

            {/* ════════════════ BODY ════════════════ */}
            <div className="flex-1 overflow-y-auto bg-slate-50/60">
              {fillMode === null ? renderModeSelection() : renderFillingContent()}
            </div>

            {/* ════════════════ FOOTER ════════════════ */}
            {renderFooter()}
          </>
        )}
      </div>
    </>
  );
}
