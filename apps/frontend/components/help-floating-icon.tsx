/**
 * "Ajuda" — botão flutuante global (mesma família visual de
 * AlertsFloatingIcon/ProductFeedbackWidget: ícone fixo na borda direita +
 * HeaderSlideScreen), sempre visível pra todo perfil — nunca atrás de um
 * feature flag como o widget "Ajuda e sugestões" (product-feedback-widget.tsx),
 * que serve a um propósito diferente (reportar problema/ideia) e some quando
 * PRODUCT_FEEDBACK_ENABLED está desligado. Onboarding precisa estar sempre
 * acessível, então ganha um ícone próprio em vez de reaproveitar aquele.
 *
 * Bloco 2/3: "Tours da plataforma" ganha categorias (Primeiros passos /
 * Alertas e comunicação / Produtos e catálogo / Memória e lançamento) e
 * busca pelo nome — nunca vira um LMS, nunca se mistura com a Allkademy
 * (curso/conteúdo estático, outro sistema). Nenhum editor administrativo de
 * conteúdo dos tours ainda.
 */
import { HelpCircle, PlayCircle, RotateCcw, CheckCircle2, Search, Ban } from "lucide-react";
import { HeaderSlideScreen } from "@/components/header-slide-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TourCategory, TourDefinition } from "@/lib/tours/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "Novo",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  adiado: "Novo",
  dispensado: "Dispensado",
};

const STATUS_CLASS: Record<string, string> = {
  nao_iniciado: "bg-blue-50 text-blue-600 border-blue-200",
  em_andamento: "bg-amber-50 text-amber-600 border-amber-200",
  concluido: "bg-emerald-50 text-emerald-600 border-emerald-200",
  adiado: "bg-blue-50 text-blue-600 border-blue-200",
  dispensado: "bg-slate-100 text-slate-500 border-slate-200",
};

const CATEGORY_LABEL: Record<TourCategory, string> = {
  "primeiros-passos": "Primeiros passos",
  "alertas-comunicacao": "Alertas e comunicação",
  "produtos-catalogo": "Produtos e catálogo",
  "memoria-lancamento": "Memória e lançamento",
};

const CATEGORY_ORDER: TourCategory[] = ["primeiros-passos", "alertas-comunicacao", "produtos-catalogo", "memoria-lancamento"];

export function HelpFloatingIcon() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { availableTours, progressFor, requestStartTour, requestRestartTour } = useOnboarding();

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? availableTours.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) : availableTours;
    const byCategory = new Map<TourCategory, TourDefinition[]>();
    for (const tour of filtered) {
      byCategory.set(tour.category, [...(byCategory.get(tour.category) ?? []), tour]);
    }
    return CATEGORY_ORDER.map((cat) => ({ category: cat, tours: byCategory.get(cat) ?? [] })).filter((g) => g.tours.length > 0);
  }, [availableTours, query]);

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
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tour pelo nome"
              className="pl-8 h-9 text-sm"
              aria-label="Buscar tour"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="text-sm text-slate-400">
              {query ? "Nenhum tour encontrado para essa busca." : "Nenhum tour disponível para o seu perfil no momento."}
            </p>
          ) : (
            grouped.map(({ category, tours }) => (
              <div key={category} className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{CATEGORY_LABEL[category]}</h3>
                <div className="space-y-2">
                  {tours.map((tour) => {
                    const progress = progressFor(tour.key);
                    const status = progress?.status ?? "nao_iniciado";
                    const doneSteps = progress?.last_step_key ? tour.steps.findIndex((s) => s.id === progress.last_step_key) + 1 : 0;
                    const actionLabel = status === "em_andamento" ? "Continuar" : status === "concluido" || status === "dispensado" ? "Refazer" : "Começar";
                    const Icon = status === "concluido" ? CheckCircle2 : status === "em_andamento" ? RotateCcw : status === "dispensado" ? Ban : PlayCircle;
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
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </HeaderSlideScreen>
    </>
  );
}
