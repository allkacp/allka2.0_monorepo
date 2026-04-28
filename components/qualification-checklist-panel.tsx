// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Minus,
  Info,
  AlertTriangle,
  ShieldCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Send,
} from "lucide-react";

// ─── Tipos inline (espelham product-context) ──────────────────────────────────
type ItemResult = "ok" | "nok" | "partial" | "na" | null;

// ─── Configuração visual de cada resultado ────────────────────────────────────
const RESULT_CONFIG = {
  ok: {
    label: "Correto",
    short: "OK",
    icon: CheckCircle2,
    cls: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700",
    badge:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  },
  nok: {
    label: "Incorreto",
    short: "NOK",
    icon: XCircle,
    cls: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-700",
    badge:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
  },
  partial: {
    label: "Parcial",
    short: "PAR",
    icon: MinusCircle,
    cls: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700",
    badge:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  },
  na: {
    label: "N/A",
    short: "N/A",
    icon: Minus,
    cls: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700",
    badge:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
};

// ─── Cálculo de score ─────────────────────────────────────────────────────────
function calcScore(
  sections: any[],
  results: Record<string, ItemResult>,
): { score: number; maxScore: number; pct: number; hasBlocker: boolean } {
  let score = 0,
    maxScore = 0,
    hasBlocker = false;
  for (const sec of sections) {
    for (const item of sec.items) {
      const r = results[item.id];
      if (r === "na") continue;
      const w = item.weight ?? 1;
      maxScore += w;
      if (r === "ok") {
        score += w;
      } else if (r === "partial") {
        score += w * 0.5;
      } else if (r === "nok" && item.isRequired) {
        hasBlocker = true;
      }
    }
  }
  return {
    score,
    maxScore,
    pct: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    hasBlocker,
  };
}

// ─── Componente de botão de resultado ─────────────────────────────────────────
function ResultButton({
  value,
  current,
  onClick,
}: {
  value: ItemResult;
  current: ItemResult;
  onClick: () => void;
}) {
  const cfg = RESULT_CONFIG[value as keyof typeof RESULT_CONFIG];
  const Icon = cfg.icon;
  const isActive = current === value;
  return (
    <button
      onClick={onClick}
      title={cfg.label}
      className={[
        "flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all",
        isActive
          ? `${cfg.bg} ${cfg.cls} border-2`
          : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{cfg.short}</span>
    </button>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function QualificationChecklistPanel({
  checklist,
  readOnly = false,
  initialResults = {},
  onSubmit,
  onReset,
}: {
  checklist: any;
  readOnly?: boolean;
  initialResults?: Record<string, ItemResult>;
  onSubmit?: (
    results: Record<string, ItemResult>,
    score: number,
    decision: "approve" | "reject" | "return",
  ) => void;
  onReset?: () => void;
}) {
  const [results, setResults] =
    useState<Record<string, ItemResult>>(initialResults);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(checklist.sections.map((s: any) => s.id)),
  );
  const [qualifierNote, setQualifierNote] = useState("");

  const setResult = (itemId: string, value: ItemResult) => {
    if (readOnly) return;
    setResults((prev) => ({ ...prev, [itemId]: value }));
  };

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const { score, maxScore, pct, hasBlocker } = useMemo(
    () => calcScore(checklist.sections, results),
    [checklist.sections, results],
  );

  const totalItems = checklist.sections.reduce(
    (a: number, s: any) => a + s.items.length,
    0,
  );
  const answeredItems = Object.values(results).filter(Boolean).length;
  const allAnswered = answeredItems === totalItems;

  // Decisão automática sugerida
  const autoApprove =
    checklist.autoApproveAbove != null &&
    pct >= checklist.autoApproveAbove &&
    !hasBlocker;
  const autoReject =
    hasBlocker ||
    (checklist.autoRejectBelow != null && pct < checklist.autoRejectBelow);
  const canReturn = checklist.allowPartialCorrection;

  const suggestedDecision: "approve" | "reject" | "return" | null = !allAnswered
    ? null
    : autoReject
      ? "reject"
      : autoApprove
        ? "approve"
        : null;

  return (
    <div className="space-y-4">
      {/* ── Barra de progresso + score ─────────────────────────────────── */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Progresso de avaliação
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {answeredItems} de {totalItems} itens avaliados
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pontuação atual</p>
            <p
              className={[
                "text-2xl font-bold mt-0.5",
                pct >= (checklist.passingScore ?? 70)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : pct >= (checklist.passingScore ?? 70) * 0.7
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400",
              ].join(" ")}
            >
              {pct}%
            </p>
          </div>
        </div>

        {/* Barra dupla: score / minimo */}
        <div className="space-y-1.5">
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            {/* Mínimo para aprovação */}
            <div
              className="absolute top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-500 z-10"
              style={{ left: `${checklist.passingScore ?? 70}%` }}
              title={`Mínimo: ${checklist.passingScore}%`}
            />
            <div
              className={[
                "h-full rounded-full transition-all duration-300",
                pct >= (checklist.passingScore ?? 70)
                  ? "bg-emerald-500"
                  : "bg-amber-500",
              ].join(" ")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Mínimo: {checklist.passingScore ?? 70}%</span>
            <span>
              {score.toFixed(1)} / {maxScore} pts
            </span>
          </div>
        </div>

        {/* Bloqueio por item obrigatório reprovado */}
        {hasBlocker && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
              Um ou mais itens obrigatórios estão marcados como "Incorreto" —
              reprovação automática.
            </p>
          </div>
        )}
      </div>

      {/* ── Seções do checklist ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {checklist.sections.map((section: any) => {
          const isOpen = openSections.has(section.id);
          const sectionAnswered = section.items.filter(
            (i: any) => results[i.id],
          ).length;
          const sectionTotal = section.items.length;
          const sectionComplete = sectionAnswered === sectionTotal;

          return (
            <div key={section.id} className="rounded-xl border overflow-hidden">
              {/* Cabeçalho da seção */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleSection(section.id)}
              >
                <ClipboardList className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{section.title}</p>
                  {section.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {section.description}
                    </p>
                  )}
                </div>
                <span
                  className={[
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                    sectionComplete
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-700"
                      : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                  ].join(" ")}
                >
                  {sectionAnswered}/{sectionTotal}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Itens da seção */}
              {isOpen && (
                <div className="divide-y">
                  {section.items.map((item: any, idx: number) => {
                    const r = results[item.id] || null;
                    const cfg = r
                      ? RESULT_CONFIG[r as keyof typeof RESULT_CONFIG]
                      : null;
                    const Icon = cfg ? cfg.icon : null;
                    return (
                      <div
                        key={item.id}
                        className={[
                          "flex items-start gap-3 px-4 py-3.5 transition-colors",
                          r === "nok" && item.isRequired
                            ? "bg-red-50/50 dark:bg-red-950/10"
                            : "",
                        ].join(" ")}
                      >
                        {/* Número */}
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start gap-2">
                            <p className="text-sm font-medium flex-1">
                              {item.label}
                            </p>
                            {item.isRequired && (
                              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 shrink-0 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700 rounded px-1.5 py-0.5">
                                Obrigatório
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground shrink-0 bg-muted rounded px-1.5 py-0.5">
                              Peso {item.weight}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          {item.hint && (
                            <div className="flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                              <Info className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{item.hint}</span>
                            </div>
                          )}
                        </div>

                        {/* Resultado atual + botões */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {/* Badge resultado atual */}
                          {r && cfg && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.badge}`}
                            >
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          )}
                          {/* Botões de avaliação */}
                          {!readOnly && (
                            <div className="flex items-center gap-1">
                              <ResultButton
                                value="ok"
                                current={r}
                                onClick={() =>
                                  setResult(item.id, r === "ok" ? null : "ok")
                                }
                              />
                              <ResultButton
                                value="partial"
                                current={r}
                                onClick={() =>
                                  setResult(
                                    item.id,
                                    r === "partial" ? null : "partial",
                                  )
                                }
                              />
                              <ResultButton
                                value="nok"
                                current={r}
                                onClick={() =>
                                  setResult(item.id, r === "nok" ? null : "nok")
                                }
                              />
                              <ResultButton
                                value="na"
                                current={r}
                                onClick={() =>
                                  setResult(item.id, r === "na" ? null : "na")
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Notas do qualificador ───────────────────────────────────────── */}
      {!readOnly && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Observações do Qualificador
          </label>
          <textarea
            className="w-full text-sm rounded-xl border bg-background px-3 py-2.5 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-muted-foreground/50"
            placeholder="Descreva as principais observações sobre a entrega, o que ficou bom e o que precisaria melhorar..."
            value={qualifierNote}
            onChange={(e) => setQualifierNote(e.target.value)}
          />
        </div>
      )}

      {/* ── Decisão sugerida + ações ────────────────────────────────────── */}
      {!readOnly && allAnswered && (
        <div
          className={[
            "rounded-xl border p-4 space-y-3",
            suggestedDecision === "approve"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700"
              : suggestedDecision === "reject"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-700"
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-700",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={[
                "h-4 w-4 shrink-0",
                suggestedDecision === "approve"
                  ? "text-emerald-600"
                  : suggestedDecision === "reject"
                    ? "text-red-600"
                    : "text-blue-600",
              ].join(" ")}
            />
            <p className="text-sm font-semibold">
              {suggestedDecision === "approve"
                ? "Decisão sugerida: Aprovar"
                : suggestedDecision === "reject"
                  ? "Decisão sugerida: Reprovar"
                  : "Avaliação completa — tome uma decisão:"}
            </p>
            <span className="ml-auto text-sm font-bold">{pct}%</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => onSubmit?.(results, pct, "approve")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovar Entrega
            </Button>
            {canReturn && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                onClick={() => onSubmit?.(results, pct, "return")}
              >
                <RotateCcw className="h-4 w-4" />
                Devolver para Correção
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
              onClick={() => onSubmit?.(results, pct, "reject")}
            >
              <XCircle className="h-4 w-4" />
              Reprovar
            </Button>
          </div>
        </div>
      )}

      {/* ── Nota: nem todos itens respondidos ───────────────────────────── */}
      {!readOnly && !allAnswered && (
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Avalie todos os {totalItems} itens para liberar a decisão final. (
          {totalItems - answeredItems} pendente
          {totalItems - answeredItems !== 1 ? "s" : ""})
        </div>
      )}
    </div>
  );
}
