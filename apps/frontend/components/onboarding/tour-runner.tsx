"use client";

/**
 * Motor + overlay visual do tour guiado (sprint de onboarding, bloco 1/3).
 *
 * Localiza o elemento de cada passo SOMENTE por `data-tour-id` (nunca texto
 * visível, classe CSS frágil ou posição na página). Um passo opcional cujo
 * alvo não existir é pulado com segurança — o motor nunca trava a página nem
 * deixa overlay preso. Nunca clica no elemento destacado nem executa
 * nenhuma ação de negócio.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TourDefinition, TourStep } from "@/lib/tours/types";

const RECHECK_INTERVAL_MS = 400;
const BALLOON_MARGIN = 12;
const BALLOON_WIDTH = 320;

interface TourRunnerProps {
  tour: TourDefinition;
  /** Passo pra retomar (id salvo em `last_step_key`) — null/ausente = começa do zero. */
  startStepId?: string | null;
  onStepChange: (stepId: string) => void;
  onComplete: () => void;
  /** Saiu sem concluir (Escape ou botão "Sair") — progresso do passo atual já foi salvo via onStepChange. */
  onExit: () => void;
}

// Alguns alvos existem em DUAS versões no DOM ao mesmo tempo (desktop/mobile,
// escondidas por breakpoint CSS — ver alerts-floating-icon.tsx/
// help-floating-icon.tsx) com o MESMO data-tour-id. `querySelector` sozinho
// pegaria sempre a primeira, mesmo se ela estiver `display:none` no viewport
// atual — por isso escolhe a primeira que realmente tem tamanho (visível).
function resolveTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour-id="${CSS.escape(step.target)}"]`);
  for (const el of candidates) {
    if (el.offsetParent !== null || el.getClientRects().length > 0) return el;
  }
  return candidates[0] ?? null;
}

export function TourRunner({ tour, startStepId, onStepChange, onComplete, onExit }: TourRunnerProps) {
  const initialIndex = useMemo(() => {
    if (!startStepId) return 0;
    const idx = tour.steps.findIndex((s) => s.id === startStepId);
    return idx >= 0 ? idx : 0;
  }, [tour, startStepId]);

  const [stepIndex, setStepIndex] = useState(initialIndex);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const balloonRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const skipGuard = useRef(0);
  // Sentido da navegação (1 = avançando, -1 = voltando) — o pulo automático
  // de passo opcional ausente precisa pular NO MESMO sentido, senão voltar
  // por cima de um passo ausente fica preso avançando de novo pra onde já
  // estava (loop).
  const direction = useRef<1 | -1>(1);

  const step = tour.steps[stepIndex] as TourStep | undefined;

  // Foco: guarda o que estava focado antes de abrir, devolve ao sair.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    return () => {
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avança com segurança quando o passo atual não tem alvo válido no DOM.
  useEffect(() => {
    if (!step) {
      onExit();
      return;
    }
    if (step.target === null) {
      setRect(null);
      setUnavailable(false);
      onStepChange(step.id);
      skipGuard.current = 0;
      return;
    }
    const el = resolveTarget(step);
    if (!el) {
      if (step.optional) {
        // Nunca deixa a página travada: se TODOS os passos restantes
        // estiverem ausentes, sai do tour em vez de girar pra sempre.
        skipGuard.current += 1;
        if (skipGuard.current > tour.steps.length) {
          onExit();
          return;
        }
        const nextIndex = stepIndex + direction.current;
        if (nextIndex >= 0 && nextIndex < tour.steps.length) {
          setStepIndex(nextIndex);
        } else {
          onExit();
        }
        return;
      }
      // Passo obrigatório sem alvo — nunca quebra a plataforma: informa e
      // segue pro próximo em vez de travar.
      setRect(null);
      setUnavailable(true);
      onStepChange(step.id);
      return;
    }
    skipGuard.current = 0;
    setUnavailable(false);
    onStepChange(step.id);
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Recalcula depois do scroll suave assentar.
    const t = setTimeout(() => setRect(el.getBoundingClientRect()), 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, tour]);

  // Recalcula posição em resize/scroll/mudança responsiva, e por um
  // intervalo curto como rede de segurança pra reflows sem scroll/resize.
  useEffect(() => {
    if (!step || step.target === null) return;
    const recompute = () => {
      const el = resolveTarget(step);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    const interval = setInterval(recompute, RECHECK_INTERVAL_MS);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      clearInterval(interval);
    };
  }, [step]);

  const goNext = useCallback(() => {
    direction.current = 1;
    if (stepIndex >= tour.steps.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, tour.steps.length, onComplete]);

  const goPrev = useCallback(() => {
    direction.current = -1;
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Teclado: Escape sai (salva o passo atual, nunca marca concluído); setas
  // navegam; foco preso dentro do balão (Tab não escapa pro resto da página).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "Tab" && balloonRef.current) {
        const focusable = balloonRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onExit, goNext, goPrev]);

  // Foco inicial no balão quando um passo (com conteúdo real) é exibido.
  useEffect(() => {
    balloonRef.current?.focus();
  }, [stepIndex]);

  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tour.steps.length - 1;
  const progressPct = Math.round(((stepIndex + 1) / tour.steps.length) * 100);

  const balloonStyle = computeBalloonStyle(rect, step.placement);

  return (
    <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-label={`Tour: ${tour.title}`}>
      {/* Fundo escurecido — recorte "spotlight" via box-shadow gigante quando há alvo. */}
      {rect ? (
        <div
          aria-hidden="true"
          className="absolute rounded-lg transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
            outline: "2px solid rgba(99, 102, 241, 0.9)",
            outlineOffset: "2px",
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/65" />
      )}

      <div
        ref={balloonRef}
        tabIndex={-1}
        className="absolute flex flex-col gap-3 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-4 outline-none border border-slate-200 dark:border-slate-700"
        style={{ ...balloonStyle, width: Math.min(BALLOON_WIDTH, window.innerWidth - 24) }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{step.title}</h2>
          <button
            type="button"
            onClick={onExit}
            aria-label="Sair do tour"
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {unavailable ? "Este conteúdo não está disponível no momento." : step.description}
        </p>

        <div className="space-y-1.5">
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-[11px] text-slate-400" aria-live="polite">
            {stepIndex + 1} de {tour.steps.length}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onExit}>
            Sair
          </Button>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goPrev} disabled={isFirst} aria-label="Passo anterior">
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </Button>
            <Button size="sm" className="h-7 text-xs btn-brand border-0" onClick={goNext}>
              {isLast ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" /> Concluir
                </>
              ) : (
                <>
                  Próximo <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Posiciona o balão perto do alvo, sempre dentro do viewport (nunca cortado no celular). */
function computeBalloonStyle(rect: DOMRect | null, placement: TourStep["placement"]): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(BALLOON_WIDTH, vw - 24);

  if (!rect) {
    // Passo central (sem alvo) ou alvo indisponível — centraliza.
    return { top: Math.max(16, vh / 2 - 100), left: Math.max(12, vw / 2 - width / 2) };
  }

  let top = rect.bottom + BALLOON_MARGIN;
  let left = rect.left;

  const effectivePlacement = placement ?? "bottom";
  if (effectivePlacement === "top") {
    top = rect.top - BALLOON_MARGIN - 160; // altura estimada do balão
  } else if (effectivePlacement === "left") {
    top = rect.top;
    left = rect.left - width - BALLOON_MARGIN;
  } else if (effectivePlacement === "right") {
    top = rect.top;
    left = rect.right + BALLOON_MARGIN;
  } else if (effectivePlacement === "center") {
    top = vh / 2 - 100;
    left = vw / 2 - width / 2;
  }

  // Clampa dentro do viewport — nunca cortado, inclusive no celular.
  left = Math.min(Math.max(12, left), vw - width - 12);
  top = Math.min(Math.max(12, top), vh - 220);

  return { top, left };
}
