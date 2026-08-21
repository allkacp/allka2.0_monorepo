import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Layers,
  CalendarClock,
  Repeat2,
  ShoppingCart,
  Info,
  Target,
  XCircle,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import type { Product } from "@/lib/contexts/product-context";

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

interface ProductContractViewProps {
  product: Product;
  /** true se ESTA opção (produto + variação escolhida) já está mesmo na cesta. */
  isItemInBasket: (variationId: string | null) => boolean;
  /**
   * Único ponto de contato com a cesta — chamado exclusivamente pelo clique
   * confirmado em "Contratar". Nada mais neste componente chama isto.
   */
  onContratar: (payload: { selectedVariation: any | null; finalPrice: number }) => void;
  onBack: () => void;
}

/**
 * Tela interna de contratação de um produto — substitui o catálogo por
 * completo (não é modal/painel sobreposto). Prioridade visual: nome →
 * categoria → opções de contratação → preço/prazo → ação. Informações
 * extensas (descrição completa, destaques, o que está incluído) ficam
 * recolhidas atrás de "Ver informações", não ocupando a tela inicial.
 *
 * Regra inegociável: `onContratar` só é chamado pelo onClick do botão
 * "Contratar" — abrir a tela, trocar de opção ou abrir "Ver informações"
 * nunca disparam isso. Ver testes em product-contract-view.test.tsx.
 */
export function ProductContractView({
  product,
  isItemInBasket,
  onContratar,
  onBack,
}: ProductContractViewProps) {
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const pres = (product as any).presentation;
  const activeVariations = (product.variations || []).filter((v: any) => v.isActive !== false);
  const hasVariations = activeVariations.length > 0;
  const sortedVariations = [...activeVariations].sort(
    (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
  );

  const displayedPrice = selectedVariation
    ? selectedVariation.price
    : hasVariations
      ? Math.min(...activeVariations.map((v: any) => v.price || 0))
      : product.finalPrice || 0;

  const canContratar = !hasVariations || !!selectedVariation;
  const alreadyInBasket = isItemInBasket(hasVariations ? (selectedVariation?.id ?? null) : null);

  // "submitting" trava o botão e NÃO é resetado automaticamente — se
  // resetasse no mesmo tick, um clique duplo rápido passaria os dois
  // cliques antes do React re-renderizar o atributo disabled, e chamaria
  // onContratar duas vezes. Só volta a liberar quando o usuário troca de
  // opção (mesmo ponto onde já limpamos justAdded).
  const handleContratar = () => {
    if (!canContratar || submitting || alreadyInBasket) return;
    setSubmitting(true);
    onContratar({ selectedVariation, finalPrice: displayedPrice });
    setJustAdded(true);
  };

  const hasInfoContent =
    !!(pres?.tagline || product.summaryDescription || product.description) ||
    !!(pres?.highlights?.length) ||
    !!(pres?.whatIsIncluded?.length) ||
    !!(pres?.notIncluded?.length) ||
    !!(pres?.deliverables?.length);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {/* ── Cabeçalho de contexto — único, nome do produto como título ── */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/50">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao catálogo
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-foreground">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold tracking-wider uppercase">
                  {product.category || "Serviço"}
                </Badge>
                <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                  {product.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Corpo: opções primeiro, informações completas sob demanda ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold mb-2.5 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              {hasVariations ? "Opções disponíveis" : "Contratação"}
            </h2>

            <div className="space-y-2">
              {hasVariations
                ? sortedVariations.map((v: any) => {
                    const isSel = selectedVariation?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariation(isSel ? null : v);
                          setJustAdded(false);
                          setSubmitting(false);
                        }}
                        className={cn(
                          "w-full text-left rounded-xl border-2 px-4 py-3 transition-all bg-background flex items-center justify-between gap-3",
                          isSel
                            ? "border-emerald-500 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900/40"
                            : "border-slate-200 dark:border-slate-700 hover:border-purple-300",
                        )}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {isSel ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight">{v.name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                              {v.deadlineDays != null && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {v.deadlineDays} dias
                                </span>
                              )}
                              {(product as any).recurrence && (
                                <span className="inline-flex items-center gap-1">
                                  <Repeat2 className="h-3 w-3" />
                                  {(product as any).recurrence}
                                </span>
                              )}
                              {v.description && (
                                <span className="line-clamp-1 max-w-[28ch]">{v.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-extrabold shrink-0",
                            isSel ? "text-emerald-600" : "text-foreground",
                          )}
                        >
                          {fmtBRL(v.price)}
                        </span>
                      </button>
                    );
                  })
                : (
                    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3 bg-background">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight">Contratação padrão</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                            {product.deliveryDays != null && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" />
                                {product.deliveryDays} dias
                              </span>
                            )}
                            {(product as any).recurrence && (
                              <span className="inline-flex items-center gap-1">
                                <Repeat2 className="h-3 w-3" />
                                {(product as any).recurrence}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-foreground shrink-0">
                        {fmtBRL(displayedPrice)}
                      </span>
                    </div>
                  )}
            </div>
          </div>

          {/* ── Ver informações — recolhido por padrão ── */}
          {hasInfoContent && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                aria-expanded={infoOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Ver informações
                </span>
                {infoOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {infoOpen && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/40 bg-muted/10">
                  {(pres?.tagline || product.summaryDescription || product.description) && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pres?.tagline || product.summaryDescription || product.description}
                    </p>
                  )}
                  {pres?.highlights?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Destaques
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {pres.highlights.map((h: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pres?.whatIsIncluded?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> O que está incluído
                      </p>
                      <div className="space-y-1">
                        {pres.whatIsIncluded.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pres?.notIncluded?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <XCircle className="h-3 w-3" /> Não está incluído
                      </p>
                      <div className="space-y-1">
                        {pres.notIncluded.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <XCircle className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pres?.deliverables?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Target className="h-3 w-3" /> O que você recebe
                      </p>
                      <div className="space-y-1">
                        {pres.deliverables.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-teal-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Rodapé fixo: preço + Contratar — único caminho até addItem ── */}
        <div className="shrink-0 border-t border-border/50 bg-background px-6 py-4 flex flex-col gap-3">
          {justAdded && (
            <div
              role="status"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Adicionado à cesta.
            </div>
          )}
          <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {hasVariations && !selectedVariation ? "A partir de" : "Total"}
            </p>
            <p className="text-lg font-extrabold text-foreground leading-tight">
              {fmtBRL(displayedPrice)}
              {(product as any).recurrence === "Mensal" && (
                <span className="text-xs font-medium text-muted-foreground">/mês</span>
              )}
            </p>
          </div>
          <Button
            size="lg"
            disabled={!canContratar || submitting || alreadyInBasket}
            onClick={handleContratar}
            className={cn(
              "gap-2 rounded-xl font-bold shadow-lg border-0",
              alreadyInBasket
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : !canContratar
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  : "text-white",
            )}
            style={
              !alreadyInBasket && canContratar
                ? { background: "var(--app-brand-button, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))" }
                : undefined
            }
          >
            <ShoppingCart className="h-4 w-4" />
            {alreadyInBasket
              ? "Já está na cesta"
              : !canContratar
                ? "Selecione uma opção para continuar"
                : "Contratar"}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
