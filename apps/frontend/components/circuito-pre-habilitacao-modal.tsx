// @ts-nocheck
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FlaskConical,
  PartyPopper,
  BookOpen,
  PlayCircle,
  ListChecks,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";

// ─── Definição das 5 etapas fixas do circuito ─────────────────────────────────
const CIRCUIT_STEPS = [
  { id: "welcome", label: "Boas-vindas", Icon: PartyPopper, color: "violet" },
  { id: "about", label: "Sobre o Teste", Icon: BookOpen, color: "blue" },
  { id: "video", label: "Vídeo", Icon: PlayCircle, color: "red" },
  { id: "rules", label: "Regras", Icon: ListChecks, color: "amber" },
  {
    id: "confirm",
    label: "Confirmar Início",
    Icon: CheckCircle2,
    color: "emerald",
  },
];

const COLOR_MAP = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-600 dark:text-violet-400",
    active:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-400",
    active: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-600 dark:text-red-400",
    active: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-600 dark:text-amber-400",
    active:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-400",
    active:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
};

// ─── Componente principal ──────────────────────────────────────────────────────
export function CircuitoPreHabilitacaoModal({
  test,
  open,
  onOpenChange,
  onConfirmStart,
  previewMode = false,
}) {
  const [step, setStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState(new Set());

  if (!test) return null;
  const pc = test.preCircuit || {};

  const isLastStep = step === CIRCUIT_STEPS.length - 1;
  const allChecked =
    (pc.confirmChecklist || []).length === 0 ||
    (pc.confirmChecklist || []).every((_, i) => checkedItems.has(i));

  const handleClose = () => {
    setStep(0);
    setCheckedItems(new Set());
    onOpenChange(false);
  };

  const handleConfirmStart = () => {
    if (!previewMode && onConfirmStart) onConfirmStart(test);
    handleClose();
  };

  const toggleCheck = (i) => {
    const next = new Set(checkedItems);
    next.has(i) ? next.delete(i) : next.add(i);
    setCheckedItems(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl app-brand-header flex items-center justify-center shadow-sm shrink-0">
              <FlaskConical className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {test.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {test.linkedTaskName}
              </p>
            </div>
          </div>
          {previewMode && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Preview Admin
            </Badge>
          )}
        </div>

        {/* ── Indicador de etapas ───────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-3 border-b bg-background">
          <div className="flex items-center gap-0.5">
            {CIRCUIT_STEPS.map((s, i) => {
              const { Icon, color, label } = s;
              const isDone = i < step;
              const isActive = i === step;
              const cls = COLOR_MAP[color];
              return (
                <div
                  key={s.id}
                  className="flex items-center flex-1 gap-0.5 min-w-0"
                >
                  <button
                    onClick={() => isDone && setStep(i)}
                    title={label}
                    className={[
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all flex-1 justify-center min-w-0",
                      isActive
                        ? cls.active
                        : isDone
                          ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                          : "text-slate-400 dark:text-slate-600 cursor-default",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${isActive ? cls.text : "text-slate-400"}`}
                      />
                    )}
                    <span className="hidden sm:block truncate">{label}</span>
                    <span className="sm:hidden font-bold">{i + 1}</span>
                  </button>
                  {i < CIRCUIT_STEPS.length - 1 && (
                    <div
                      className={`h-px w-3 shrink-0 ${isDone ? "bg-emerald-300 dark:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Conteúdo da etapa (scrollável) ───────────────────────────────── */}
        <ScrollArea className="flex-1">
          {/* Etapa 0 — Boas-vindas */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center space-y-6">
              <div className="h-20 w-20 rounded-2xl app-brand-header flex items-center justify-center shadow-lg">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {pc.welcomeTitle || "Bem-vindo ao Circuito de Habilitação"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {pc.welcomeSubtitle ||
                    "Siga as etapas para concluir seu teste de habilitação."}
                </p>
              </div>
              {(pc.welcomeHighlights || []).length > 0 && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  {pc.welcomeHighlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-left"
                    >
                      <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etapa 1 — Sobre o Teste */}
          {step === 1 && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Sobre o Teste
                </h3>
                {pc.estimatedTime && (
                  <Badge variant="outline" className="text-xs ml-auto gap-1">
                    <Clock className="h-3 w-3" /> {pc.estimatedTime}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {pc.aboutDescription}
              </p>
              {(pc.aboutWhatToExpect || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    O que você vai fazer
                  </p>
                  <div className="space-y-2">
                    {pc.aboutWhatToExpect.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl border p-3"
                      >
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Etapa 2 — Vídeo */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <PlayCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Vídeo Orientativo
                </h3>
                {pc.videoDuration && (
                  <Badge variant="outline" className="text-xs ml-auto gap-1">
                    <Clock className="h-3 w-3" /> {pc.videoDuration}
                  </Badge>
                )}
              </div>

              {pc.videoUrl ? (
                <div className="rounded-xl overflow-hidden border aspect-video bg-slate-900 relative">
                  {pc.videoUrl.includes("youtube.com") ||
                  pc.videoUrl.includes("youtu.be") ? (
                    <iframe
                      src={pc.videoUrl
                        .replace("watch?v=", "embed/")
                        .replace("youtu.be/", "youtube.com/embed/")}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      href={pc.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center h-full text-white gap-3 hover:opacity-80 transition-opacity"
                    >
                      <PlayCircle className="h-16 w-16 opacity-80" />
                      <span className="text-sm opacity-80">Assistir vídeo</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed bg-muted/30 aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <PlayCircle className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Vídeo ainda não disponível</p>
                  <p className="text-xs opacity-70">
                    Continue para as próximas etapas
                  </p>
                </div>
              )}

              {pc.videoTitle && (
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {pc.videoTitle}
                </p>
              )}
              {pc.videoDescription && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pc.videoDescription}
                </p>
              )}
            </div>
          )}

          {/* Etapa 3 — Regras de Execução */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <ListChecks className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Regras de Execução
                </h3>
              </div>

              <div className="space-y-2">
                {(pc.rules || []).map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border p-3"
                  >
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {rule}
                    </span>
                  </div>
                ))}
              </div>

              {(pc.warnings || []).length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                      Avisos Importantes
                    </p>
                  </div>
                  {pc.warnings.map((w, i) => (
                    <p
                      key={i}
                      className="text-xs text-red-700 dark:text-red-400 pl-6"
                    >
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etapa 4 — Confirmar Início */}
          {step === 4 && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Pronto para Começar?
                </h3>
              </div>

              {/* Resumo */}
              <div className="rounded-xl bg-muted/40 border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo do Teste
                </p>
                <p className="text-sm font-semibold">{test.name}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {test.timeLimit && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Tempo limite:{" "}
                      <strong className="text-foreground">
                        {test.timeLimit} min
                      </strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Aprovação:{" "}
                    <strong className="text-foreground">
                      {test.passingScore}%
                    </strong>
                  </span>
                </div>
              </div>

              {/* Checklist de confirmação */}
              {(pc.confirmChecklist || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Confirme antes de iniciar:
                  </p>
                  {pc.confirmChecklist.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleCheck(i)}
                      className={[
                        "w-full flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                        checkedItems.has(i)
                          ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700"
                          : "hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {checkedItems.has(i) ? (
                        <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!allChecked && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Marque todos os itens acima para liberar o botão de início.
                </p>
              )}

              {previewMode && (
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-3 text-xs text-violet-700 dark:text-violet-400 flex items-center gap-2">
                  <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                  Modo preview — o botão "Iniciar Teste" está desabilitado nesta
                  visualização.
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ── Rodapé ────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t px-6 py-4 bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={step > 0 ? () => setStep((s) => s - 1) : handleClose}
          >
            {step > 0 ? (
              <>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </>
            ) : (
              "Fechar"
            )}
          </Button>

          <div className="flex items-center gap-1">
            {CIRCUIT_STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-5 bg-violet-500"
                    : i < step
                      ? "w-1.5 bg-emerald-400"
                      : "w-1.5 bg-slate-200 dark:bg-slate-700",
                ].join(" ")}
              />
            ))}
          </div>

          {isLastStep ? (
            <Button
              size="sm"
              className="btn-brand gap-1.5"
              disabled={!allChecked || previewMode}
              onClick={handleConfirmStart}
            >
              <FlaskConical className="h-4 w-4" />
              {previewMode ? "Preview" : "Iniciar Teste"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="btn-brand gap-1.5"
              onClick={() => setStep((s) => s + 1)}
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
