/**
 * "Ajuda" — botão flutuante global (mesma família visual de
 * AlertsFloatingIcon/ProductFeedbackWidget: ícone fixo na borda direita +
 * HeaderSlideScreen), sempre visível pra todo perfil — nunca atrás de um
 * feature flag como o widget "Ajuda e sugestões" (product-feedback-widget.tsx),
 * que serve a um propósito diferente (reportar problema/ideia) e some quando
 * PRODUCT_FEEDBACK_ENABLED está desligado. Onboarding precisa estar sempre
 * acessível, então ganha um ícone próprio em vez de reaproveitar aquele.
 *
 * Conteúdo (bloco 1/3): só a seção "Tours da plataforma". Nenhum editor
 * administrativo de conteúdo aqui ainda.
 */
import { HelpCircle, PlayCircle, RotateCcw, CheckCircle2 } from "lucide-react";
import { HeaderSlideScreen } from "@/components/header-slide-screen";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/onboarding-context";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "Novo",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  adiado: "Novo",
  dispensado: "Novo",
};

const STATUS_CLASS: Record<string, string> = {
  nao_iniciado: "bg-blue-50 text-blue-600 border-blue-200",
  em_andamento: "bg-amber-50 text-amber-600 border-amber-200",
  concluido: "bg-emerald-50 text-emerald-600 border-emerald-200",
  adiado: "bg-blue-50 text-blue-600 border-blue-200",
  dispensado: "bg-blue-50 text-blue-600 border-blue-200",
};

export function HelpFloatingIcon() {
  const [open, setOpen] = useState(false);
  const { availableTours, progressFor, requestStartTour, requestRestartTour } = useOnboarding();

  return (
    <>
      {/* Desktop — barra vertical direita, próximo slot livre da coluna. */}
      <div className="hidden lg:block fixed top-[325px] right-[8px] z-65 group">
        <button
          type="button"
          data-tour-id="help-button"
          onClick={() => setOpen(true)}
          aria-label="Ajuda"
          title="Ajuda"
          className="relative flex items-center justify-center h-10 w-10 text-white/70 hover:text-white transition-colors"
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
          Ajuda
        </span>
      </div>

      {/* Mobile/tablet — mesmo padrão de botão flutuante redondo, mais um degrau empilhado acima de Alertas. */}
      <button
        type="button"
        data-tour-id="help-button"
        onClick={() => setOpen(true)}
        aria-label="Ajuda"
        className="lg:hidden fixed right-4 z-45 flex items-center justify-center h-14 w-14 rounded-full bg-slate-700 text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] active:scale-95 transition-transform"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 164px)" }}
      >
        <HelpCircle className="h-6 w-6 shrink-0" />
      </button>

      <HeaderSlideScreen open={open} onClose={() => setOpen(false)} title="Ajuda" subtitle="Tours da plataforma">
        <div className="p-4 space-y-3">
          {availableTours.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum tour disponível para o seu perfil no momento.</p>
          ) : (
            availableTours.map((tour) => {
              const progress = progressFor(tour.key);
              const status = progress?.status ?? "nao_iniciado";
              const doneSteps = progress?.last_step_key ? tour.steps.findIndex((s) => s.id === progress.last_step_key) + 1 : 0;
              const actionLabel = status === "em_andamento" ? "Continuar" : status === "concluido" ? "Refazer" : "Começar";
              const Icon = status === "concluido" ? CheckCircle2 : status === "em_andamento" ? RotateCcw : PlayCircle;
              return (
                <div key={tour.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{tour.title}</h4>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", STATUS_CLASS[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tour.description}</p>
                  {doneSteps > 0 && status !== "concluido" && (
                    <p className="text-[11px] text-slate-400">
                      Passo {doneSteps} de {tour.steps.length}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs btn-brand border-0"
                    onClick={() => {
                      setOpen(false);
                      if (status === "concluido" || status === "dispensado") {
                        requestRestartTour(tour.key);
                      } else {
                        requestStartTour(tour.key);
                      }
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1" /> {actionLabel}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </HeaderSlideScreen>
    </>
  );
}
