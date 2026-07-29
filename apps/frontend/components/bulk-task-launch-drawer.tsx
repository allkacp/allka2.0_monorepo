// @ts-nocheck
// Lançamento em lote — para produtos "pacote" (2+ ProjectTask do mesmo
// ProjectProduct). Mesma ideia do TaskLaunchDrawer (apps/frontend/components/
// task-launch-drawer.tsx), mas operando sobre VÁRIAS tarefas de uma vez: um
// único texto livre é distribuído pela IA nos questionários de TODAS as
// tarefas do lote, e um único botão libera todas juntas
// (POST/PATCH /project-tasks/bulk-submit-briefing). O lançamento
// individual por tarefa (TaskLaunchDrawer) continua existindo, sem mudança,
// como alternativa — este componente não o substitui.
//
// Escopo desta primeira versão: sem anexos por tarefa (o usuário ainda pode
// abrir o TaskLaunchDrawer de uma tarefa específica depois pra anexar
// arquivos/links, se precisar) — o pedido original era especificamente sobre
// responder os questionários e liberar todas de uma vez.
import { useState, useEffect } from "react";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
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
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Sparkles,
  Wand2,
  Send,
  ArrowLeft,
  Info,
  AlertCircle,
  ClipboardList,
  FileText,
  ExternalLink,
  Check,
  Package,
  Layers,
} from "lucide-react";

function getQuestionKey(q: any, idx: number): string {
  return q.question_key ?? q.id ?? `q_${idx}`;
}

function tryParseJson(data: any): any[] {
  if (!data) return [];
  try {
    const p = typeof data === "string" ? JSON.parse(data) : data;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

interface TaskEntry {
  task: any;
  briefingQuestions: any[];
  answers: Record<string, any>;
}

interface BulkTaskLaunchDrawerProps {
  tasks: any[];
  onClose: () => void;
  onReleased: (taskIds: string[]) => void;
}

export function BulkTaskLaunchDrawer({
  tasks,
  onClose,
  onReleased,
}: BulkTaskLaunchDrawerProps) {
  const [initializing, setInitializing] = useState(true);
  const [entries, setEntries] = useState<TaskEntry[]>([]);
  const [fillMode, setFillMode] = useState<null | "manual" | "ai">(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFilledKeys, setAiFilledKeys] = useState<Set<string>>(new Set());
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [aiFillSuccess, setAiFillSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setInitializing(true);
      try {
        const loaded: TaskEntry[] = await Promise.all(
          tasks.map(async (task) => {
            let currentTask = task;
            if (task.status === "PARA_LANCAMENTO") {
              try {
                await apiClient.launchProjectTask(task.id);
                currentTask = { ...task, status: "EM_LANCAMENTO" };
              } catch {
                // already launched in a race — continue with current status
              }
            }
            let questions: any[] = [];
            let answersMap: Record<string, any> = {};
            try {
              const briefingRes = await apiClient.getProjectTaskBriefing(task.id);
              questions = briefingRes?.briefing_questions ?? [];
              const existingAnswers: any[] = briefingRes?.answers ?? [];
              for (const ans of existingAnswers) {
                answersMap[ans.question_key] = {
                  answer: ans.answer ?? "",
                  selected_options: tryParseJson(ans.files),
                  links: tryParseJson(ans.links),
                };
              }
            } catch {}
            return { task: currentTask, briefingQuestions: questions, answers: answersMap };
          }),
        );
        if (!cancelled) {
          setEntries(loaded);
          if (loaded.some((e) => Object.keys(e.answers).length > 0)) setFillMode("manual");
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  function setAnswer(taskId: string, key: string, patch: Record<string, any>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.task.id === taskId
          ? { ...e, answers: { ...e.answers, [key]: { ...(e.answers[key] ?? {}), ...patch } } }
          : e,
      ),
    );
  }

  // ── Computed: missing-required per task + totals ──────────────────────────
  function missingForEntry(entry: TaskEntry) {
    return entry.briefingQuestions.filter((q, idx) => {
      if (!q.required) return false;
      const key = getQuestionKey(q, idx);
      const a = entry.answers[key];
      if (!a) return true;
      if (q.type === "multiple_choice") return !(a.selected_options?.length > 0);
      if (q.type === "select") return !a.answer;
      return !a.answer?.trim();
    });
  }

  const totalRequired = entries.reduce(
    (sum, e) => sum + e.briefingQuestions.filter((q) => q.required).length,
    0,
  );
  const totalMissing = entries.reduce((sum, e) => sum + missingForEntry(e).length, 0);
  const totalAnswered = totalRequired - totalMissing;
  const progressPct = totalRequired > 0 ? Math.round((totalAnswered / totalRequired) * 100) : 100;
  const canReleaseAll = totalMissing === 0;

  // ── AI fill: applies the same free text to every task's own questions ────
  async function handleAIFillAll() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiFillSuccess(false);
    try {
      const filledKeys = new Set<string>();
      const updatedEntries = await Promise.all(
        entries.map(async (entry) => {
          if (entry.briefingQuestions.length === 0) return entry;
          const questionsPayload = entry.briefingQuestions.map((q, idx) => ({
            question_key: getQuestionKey(q, idx),
            question_text: q.question_text ?? q.label ?? `Pergunta ${idx + 1}`,
            type: q.type,
            options: q.options,
            required: q.required,
          }));
          let suggested: Record<string, string> = {};
          try {
            const res: any = await apiClient.aiFillBriefing({
              free_text: aiText,
              questions: questionsPayload,
            });
            for (const a of res?.answers ?? []) {
              if (a?.question_key && a?.answer) suggested[a.question_key] = a.answer;
            }
          } catch {
            return entry;
          }
          const newAnswers = { ...entry.answers };
          for (const [key, value] of Object.entries(suggested)) {
            if (!value) continue;
            const alreadyHasAnswer =
              entry.answers[key]?.answer?.trim() || entry.answers[key]?.selected_options?.length > 0;
            if (!alreadyHasAnswer || overwriteExisting) {
              newAnswers[key] = { ...(newAnswers[key] ?? {}), answer: value };
              filledKeys.add(`${entry.task.id}:${key}`);
            }
          }
          return { ...entry, answers: newAnswers };
        }),
      );
      setEntries(updatedEntries);
      setAiFilledKeys(filledKeys);
      setAiFillSuccess(true);
      setFillMode("manual");
    } catch (err: any) {
      setAiError(err?.message || "Não foi possível processar o briefing. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleImproveAnswer(entry: TaskEntry, question: any, idx: number) {
    const key = getQuestionKey(question, idx);
    const questionText = question.question_text ?? question.label ?? `Pergunta ${idx + 1}`;
    const currentAnswer = entry.answers[key]?.answer ?? "";
    try {
      const res: any = await apiClient.aiImproveAnswer({
        question_text: questionText,
        current_answer: currentAnswer,
        type: question.type,
      });
      if (res?.improved_answer) {
        setAnswer(entry.task.id, key, { answer: res.improved_answer });
      }
    } catch {}
  }

  // ── Submit all ─────────────────────────────────────────────────────────────
  async function handleSubmitAll() {
    if (!canReleaseAll || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items = entries.map((entry) => {
        const answers =
          entry.briefingQuestions.length > 0
            ? entry.briefingQuestions.map((q, idx) => {
                const key = getQuestionKey(q, idx);
                const a = entry.answers[key] ?? {};
                const answerText =
                  q.type === "multiple_choice" ? (a.selected_options ?? []).join(", ") : (a.answer ?? "");
                return {
                  question_key: key,
                  question_text: q.question_text ?? q.label ?? `Pergunta ${idx + 1}`,
                  answer: answerText,
                  ...(q.type === "link" && a.links?.length ? { links: JSON.stringify(a.links) } : {}),
                };
              })
            : [{ question_key: "_no_briefing", question_text: "Sem briefing", answer: "" }];
        return { task_id: entry.task.id, answers };
      });
      await apiClient.bulkSubmitProjectTaskBriefing(items);
      onReleased(entries.map((e) => e.task.id));
    } catch (e: any) {
      setSubmitError(e?.message ?? "Erro ao enviar os briefings. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(entry: TaskEntry, q: any, idx: number) {
    const key = getQuestionKey(q, idx);
    const label = q.question_text ?? q.label ?? `Pergunta ${idx + 1}`;
    const a = entry.answers[key] ?? {};
    const isMissing = q.required && missingForEntry(entry).some((mq, i) => getQuestionKey(mq, i) === key);
    const wasAiFilled = aiFilledKeys.has(`${entry.task.id}:${key}`);

    return (
      <div
        key={key}
        className={cn(
          "rounded-xl border bg-white p-4 space-y-3",
          isMissing ? "border-red-200 bg-red-50/20" : "border-slate-200",
        )}
      >
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
            {wasAiFilled && (
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

        {(q.type === "text_short" || !q.type) && (
          <>
            <Input
              placeholder="Sua resposta..."
              value={a.answer ?? ""}
              onChange={(e) => setAnswer(entry.task.id, key, { answer: e.target.value })}
              className={cn("text-sm", isMissing && !a.answer?.trim() && "border-red-300")}
            />
            <button
              type="button"
              onClick={() => handleImproveAnswer(entry, q, idx)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700"
            >
              <Sparkles className="h-3 w-3" />
              Melhorar com IA
            </button>
          </>
        )}

        {q.type === "text_long" && (
          <>
            <Textarea
              placeholder="Descreva em detalhes..."
              value={a.answer ?? ""}
              onChange={(e) => setAnswer(entry.task.id, key, { answer: e.target.value })}
              rows={3}
              className={cn("text-sm resize-none", isMissing && !a.answer?.trim() && "border-red-300")}
            />
            <button
              type="button"
              onClick={() => handleImproveAnswer(entry, q, idx)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700"
            >
              <Sparkles className="h-3 w-3" />
              Melhorar com IA
            </button>
          </>
        )}

        {q.type === "select" && (
          <Select value={a.answer ?? ""} onValueChange={(val) => setAnswer(entry.task.id, key, { answer: val })}>
            <SelectTrigger className={cn("text-sm", isMissing && !a.answer && "border-red-300")}>
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

        {q.type === "multiple_choice" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt: string) => {
              const selected = (a.selected_options ?? []).includes(opt);
              return (
                <div key={opt} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`${entry.task.id}_${key}_${opt}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current: string[] = a.selected_options ?? [];
                      setAnswer(entry.task.id, key, {
                        selected_options: checked ? [...current, opt] : current.filter((o) => o !== opt),
                      });
                    }}
                  />
                  <Label htmlFor={`${entry.task.id}_${key}_${opt}`} className="text-sm cursor-pointer">
                    {opt}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {q.type === "link" && (
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={a.answer ?? ""}
              onChange={(e) => setAnswer(entry.task.id, key, { answer: e.target.value })}
              type="url"
              className={cn("text-sm", isMissing && !a.answer?.trim() && "border-red-300")}
            />
            {a.answer?.trim() && (
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" asChild>
                <a href={a.answer} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )}

        {q.type === "file" && (
          <p className="text-xs text-slate-500">
            Anexos ficam disponíveis abrindo esta tarefa individualmente após o lançamento em lote.
          </p>
        )}

        {isMissing && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Campo obrigatório — preencha antes de liberar
          </p>
        )}
      </div>
    );
  }

  function renderModeSelection() {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex gap-3">
          <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-700">
            Preencha o briefing das {entries.length} tarefas deste produto para liberar todas de uma vez.
          </p>
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Como deseja preencher?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setFillMode("manual")}
            className="text-left rounded-2xl border-2 border-slate-200 bg-white p-5 hover:border-indigo-400 hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Responder pergunta por pergunta</p>
            <p className="text-xs text-slate-500">Preencha manualmente o briefing de cada tarefa do lote.</p>
          </button>

          <button
            onClick={() => setFillMode("ai")}
            className="text-left rounded-2xl border-2 border-slate-200 bg-white p-5 hover:border-violet-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3">
              <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold border border-violet-200">
                Novo
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
              <Wand2 className="h-5 w-5 text-violet-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Preencher todas com Assistente</p>
            <p className="text-xs text-slate-500">
              Cole o briefing do cliente uma vez e o assistente distribui nos questionários de todas as{" "}
              {entries.length} tarefas.
            </p>
          </button>
        </div>
      </div>
    );
  }

  function renderFillingContent() {
    if (fillMode === "ai") {
      return (
        <div className="px-6 py-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Wand2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Preencher todas as tarefas com Assistente</p>
              <p className="text-xs text-slate-500">
                O mesmo texto é distribuído no questionário de cada uma das {entries.length} tarefas.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Consultor IA (Gemini).</span> Nenhuma resposta é enviada
              automaticamente — revise e ajuste na etapa seguinte antes de liberar.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Texto livre com informações do cliente
            </Label>
            <Textarea
              placeholder="Cole aqui o briefing geral do cliente. O assistente vai organizar nos questionários de todas as tarefas do pacote."
              rows={9}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="bulk-overwrite-existing"
              checked={overwriteExisting}
              onCheckedChange={(checked) => setOverwriteExisting(!!checked)}
            />
            <Label htmlFor="bulk-overwrite-existing" className="text-sm text-slate-600 cursor-pointer">
              Sobrescrever respostas já preenchidas
            </Label>
          </div>

          {aiError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{aiError}</p>
            </div>
          )}

          <Button
            onClick={handleAIFillAll}
            disabled={aiLoading || !aiText.trim()}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white w-full"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {aiLoading ? "Processando…" : `Organizar nas ${entries.length} tarefas`}
          </Button>
        </div>
      );
    }

    return (
      <div className="px-6 py-6 space-y-6">
        {aiFillSuccess && aiFilledKeys.size > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-start gap-3">
            <Wand2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-800">
                {aiFilledKeys.size} {aiFilledKeys.size === 1 ? "sugestão aplicada" : "sugestões aplicadas"}
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                Revise os campos marcados com <span className="font-semibold">Sugerido automaticamente</span> antes
                de liberar.
              </p>
            </div>
          </div>
        )}

        {entries.map((entry) => {
          const missing = missingForEntry(entry);
          const requiredCount = entry.briefingQuestions.filter((q) => q.required).length;
          return (
            <section key={entry.task.id} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-700">{entry.task.title}</h3>
                {entry.task.task_code && (
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    {entry.task.task_code}
                  </span>
                )}
                {requiredCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0",
                      missing.length === 0
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-orange-50 text-orange-600 border-orange-200",
                    )}
                  >
                    {requiredCount - missing.length}/{requiredCount} obrigatórios
                  </span>
                )}
              </div>

              {entry.briefingQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                  <FileText className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400">Esta tarefa não possui perguntas de briefing.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entry.briefingQuestions.map((q, idx) => renderQuestion(entry, q, idx))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <EmbeddedSlideScreen open={true} onClose={onClose} hideHeader>
      <div className="flex flex-col flex-1 min-h-0 w-full">
        {initializing ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">Preparando lançamento em lote…</p>
          </div>
        ) : (
          <>
            <div
              className="px-6 pt-5 pb-5 shrink-0 text-white"
              style={{
                background: "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-white/20 text-white border-white/30">
                  <Package className="h-3 w-3 shrink-0" />
                  Lançamento em lote · {entries.length} tarefas
                </span>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
                  aria-label="Fechar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <h2 className="text-xl font-bold text-white leading-tight mb-2">
                {entries[0]?.task?.project_product?.product_name_snapshot ?? "Produto"}
              </h2>

              {fillMode === "manual" && totalRequired > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-xs">Briefing obrigatório (todas as tarefas)</span>
                    <span className="text-white text-xs font-semibold">
                      {totalAnswered}/{totalRequired}
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

            <div className="flex-1 overflow-y-auto bg-slate-50/60">
              {fillMode === null ? renderModeSelection() : renderFillingContent()}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
              {submitError && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}
              {fillMode === "manual" && !canReleaseAll && totalMissing > 0 && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Responda {totalMissing === 1 ? "a pergunta obrigatória" : `as ${totalMissing} perguntas obrigatórias`}{" "}
                    antes de liberar todas as tarefas.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={onClose} className="text-slate-600">
                    Cancelar
                  </Button>
                  {fillMode !== null && (
                    <Button variant="ghost" onClick={() => setFillMode(null)} className="gap-1.5 text-slate-500">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar
                    </Button>
                  )}
                </div>
                {fillMode !== null && (
                  <Button
                    onClick={handleSubmitAll}
                    disabled={submitting || fillMode === "ai" || !canReleaseAll}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Lançar todas as {entries.length} tarefas
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </EmbeddedSlideScreen>
  );
}
