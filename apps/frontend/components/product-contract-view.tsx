import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Layers,
  CalendarClock,
  Repeat2,
  ShoppingCart,
  Info,
  Target,
  XCircle,
  Sparkles,
  ClipboardList,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  MessageCircle,
  Tag,
  FileText,
  Images,
  Package,
  Link2,
  PlusCircle,
  Zap,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { useAccountType } from "@/contexts/account-type-context";
import { useProducts, type Product } from "@/lib/contexts/product-context";
import { useTelaEstreita } from "@/hooks/useTelaEstreita";
import { ProductNomadsTab } from "@/components/admin/product-nomads-tab";
import { ProductRatingDisplay } from "@/components/product-rating-display";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  fmtBRL,
  parsePlatforms,
  parseCampaigns,
  parsePages,
  getDeadlineLabel,
  FaqItem,
  Section,
  PortfolioGallery,
} from "@/components/product-detail-shared";

// ── Divisor ajustável entre as colunas de detalhes e contratação ──────────
// v2: a coluna de opções/contratação passou a ser a maior por padrão (~58%
// contra ~42% de detalhes, lote de densidade 2026-08-21) — chave nova pra
// não herdar uma largura salva sob a proporção antiga (~34%), que ficaria
// visualmente errada (pequena demais) sob o novo padrão.
const PANEL_STORAGE_KEY = "allka:product-detail-right-fraction-v2";
const DEFAULT_RIGHT_FRACTION = 0.58;
const MIN_RIGHT_FRACTION = 0.35;
const MAX_RIGHT_FRACTION = 0.65;
const KEYBOARD_STEP = 0.02;
const HIGHLIGHTS_PREVIEW_COUNT = 4;

function clampRightFraction(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RIGHT_FRACTION;
  return Math.min(MAX_RIGHT_FRACTION, Math.max(MIN_RIGHT_FRACTION, value));
}

function readStoredRightFraction(): number {
  if (typeof window === "undefined") return DEFAULT_RIGHT_FRACTION;
  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return DEFAULT_RIGHT_FRACTION;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < MIN_RIGHT_FRACTION || parsed > MAX_RIGHT_FRACTION) {
      return DEFAULT_RIGHT_FRACTION;
    }
    return parsed;
  } catch {
    return DEFAULT_RIGHT_FRACTION;
  }
}

interface ProductContractViewProps {
  product: Product;
  /** true se ESTA opção (produto + variação escolhida) já está mesmo na cesta. */
  isItemInBasket: (variationId: string | null) => boolean;
  /**
   * Único ponto de contato com a cesta para o produto principal — chamado
   * exclusivamente pelo clique confirmado em "Contratar". Nada mais neste
   * componente chama isto.
   */
  onContratar: (payload: { selectedVariation: any | null; finalPrice: number }) => void;
  onBack: () => void;
  /** Navega para a tela cheia de um produto complementar (ele tem opções a escolher). */
  onViewComplementaryProduct?: (productId: string) => void;
  /** Adiciona diretamente um produto complementar sem opções — ação explícita e separada da do produto principal. */
  onAddComplementaryProduct?: (product: Product) => void;
}

type TabId = "detalhes" | "portfolio" | "nomades";

/**
 * Tela interna de contratação de um produto — substitui o catálogo por
 * completo (não é modal/painel sobreposto). Recupera a riqueza de conteúdo
 * do antigo ProductDetailSheet (abas, apresentação completa, portfólio,
 * nômades relacionados, produtos complementares) dentro do novo container
 * de página cheia, com opções de contratação sempre visíveis.
 *
 * Regra inegociável: `onContratar` só é chamado pelo onClick do botão
 * "Contratar" — abrir a tela, trocar de aba, expandir a descrição, abrir o
 * portfólio ou trocar de opção nunca disparam isso. Ver testes em
 * product-contract-view.test.tsx.
 */
export function ProductContractView({
  product,
  isItemInBasket,
  onContratar,
  onBack,
  onViewComplementaryProduct,
  onAddComplementaryProduct,
}: ProductContractViewProps) {
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("detalhes");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [highlightsExpanded, setHighlightsExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  // Só uma opção expandida por vez, pra economizar espaço — expandir é uma
  // ação separada de selecionar (nenhuma altera a cesta, nenhuma faz a
  // outra sozinha).
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const { accountType } = useAccountType();
  const isAdmin = accountType === "admin";
  const { products: allProducts } = useProducts();

  // Colunas ajustáveis (Detalhes / Contratação) — só no desktop; no celular
  // e tablet estreito vira uma coluna única, sem divisor.
  const isNarrowViewport = useTelaEstreita(1024);
  const isTwoColumnLayout = !isNarrowViewport;
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const [rightFraction, setRightFraction] = useState<number>(() => readStoredRightFraction());
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(rightFraction));
    } catch {
      // localStorage indisponível (modo privado, quota etc.) — segue sem persistir
    }
  }, [rightFraction]);

  useEffect(() => {
    if (!isDraggingDivider) return;
    const handleMove = (e: MouseEvent) => {
      const el = columnsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const fromRight = rect.right - e.clientX;
      setRightFraction(clampRightFraction(fromRight / rect.width));
    };
    const handleUp = () => setIsDraggingDivider(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isDraggingDivider]);

  const handleDividerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setRightFraction((f) => clampRightFraction(f + KEYBOARD_STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setRightFraction((f) => clampRightFraction(f - KEYBOARD_STEP));
    } else if (e.key === "Home" || e.key === "Enter") {
      e.preventDefault();
      setRightFraction(DEFAULT_RIGHT_FRACTION);
    }
  };

  const pres = (product as any).presentation;
  const hasPresentation = !!pres;
  const activeVariations = (product.variations || []).filter((v: any) => v.isActive !== false);
  const hasVariations = activeVariations.length > 0;
  const sortedVariations = [...activeVariations].sort(
    (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
  );
  const variationsInternal: Record<string, any> = (product as any).variationsInternal ?? {};

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

  const selectVariation = (v: any | null) => {
    setSelectedVariation(v);
    setJustAdded(false);
    setSubmitting(false);
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "detalhes", label: "Detalhes", icon: FileText },
    { id: "portfolio", label: "Portfólio", icon: Images },
    ...(isAdmin ? [{ id: "nomades" as const, label: "Nômades", icon: Users }] : []),
  ];

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {/* ══════════════════════════════════════════════════════════════
            CABEÇALHO INSTITUCIONAL — degradê oficial da Allka, único,
            compacto. Esquerda: identidade e metadados. Direita: destaques
            (recolhíveis). Nenhum segundo título/cabeçalho de página.
        ══════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 relative overflow-hidden mb-3 rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]">
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }}
          />
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 88% 15%, rgba(255,255,255,0.35), transparent 45%)" }}
          />

          <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-start gap-4">
            {/* ── Esquerda: identidade e metadados ── */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors mb-2.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao catálogo
                </button>
                <div className="shrink-0 -mt-1 -mr-1">
                  <CopyLinkButton />
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white mb-2">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-white uppercase tracking-wider">
                  {product.category || "Serviço"}
                </span>
                {hasVariations && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                    <Layers className="h-2.5 w-2.5" />
                    {activeVariations.length} {activeVariations.length === 1 ? "opção" : "opções"}
                  </span>
                )}
                <span className="inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white/80 tracking-widest">
                  {product.id}
                </span>
                {(product as any).recurrence && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                    <Repeat2 className="h-2.5 w-2.5" />
                    {(product as any).recurrence}
                  </span>
                )}
                {product.deliveryDays && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                    <CalendarClock className="h-2.5 w-2.5" />
                    {product.deliveryDays} dias
                  </span>
                )}
                {(product as any).itemLimit && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                    <Users className="h-2.5 w-2.5" />
                    {(product as any).itemLimit} contrato{(product as any).itemLimit !== 1 ? "s" : ""}
                  </span>
                )}
                <ProductRatingDisplay
                  productId={product.id}
                  size="xs"
                  showCount={true}
                  variant="white"
                  className="bg-white/12 rounded-full px-2 py-0.5 border border-white/20"
                />
              </div>

              {pres?.tagline && (
                <div className="max-w-2xl">
                  <p
                    className={cn(
                      "text-xs text-white/75 leading-snug",
                      descriptionExpanded ? "max-h-32 overflow-y-auto pr-1" : "line-clamp-2",
                    )}
                  >
                    {pres.tagline}
                  </p>
                  {pres.tagline.length > 140 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((v) => !v)}
                      className="mt-1 text-[11px] font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                    >
                      {descriptionExpanded ? "Mostrar menos" : "Ver descrição completa"}
                    </button>
                  )}
                </div>
              )}
              {!hasPresentation && (product.summaryDescription || product.description) && (
                <div className="max-w-2xl">
                  <p
                    className={cn(
                      "text-xs text-white/75 leading-snug",
                      descriptionExpanded ? "max-h-32 overflow-y-auto pr-1" : "line-clamp-2",
                    )}
                  >
                    {product.summaryDescription || product.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((v) => !v)}
                    className="mt-1 text-[11px] font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                  >
                    {descriptionExpanded ? "Mostrar menos" : "Ver descrição completa"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Direita: destaques (recolhíveis) ── */}
            {pres?.highlights?.length > 0 && (
              <div className="lg:w-72 shrink-0 lg:border-l lg:border-white/15 lg:pl-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/15">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-1.5">
                  Destaques
                </p>
                <div
                  className={cn(
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-1",
                    highlightsExpanded && "max-h-40 overflow-y-auto pr-1",
                  )}
                >
                  {(highlightsExpanded ? pres.highlights : pres.highlights.slice(0, HIGHLIGHTS_PREVIEW_COUNT)).map(
                    (h: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[12px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0 mt-0.5" />
                        <span className="text-white/90 leading-snug">{h}</span>
                      </div>
                    ),
                  )}
                </div>
                {pres.highlights.length > HIGHLIGHTS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setHighlightsExpanded((v) => !v)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                  >
                    {highlightsExpanded ? (
                      <>
                        Mostrar menos
                        <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Ver todos os destaques
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CORPO — abas + conteúdo (principal) e opções/contratação
            (lateral no desktop, redimensionável; primeiro no mobile).
            Tudo dentro do mesmo container branco.
        ══════════════════════════════════════════════════════════════ */}
        <div ref={columnsRef} className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
          {/* ── ÁREA PRINCIPAL: abas + conteúdo informativo ─────────── */}
          <div
            className="flex flex-col min-h-0 order-2 lg:order-1 min-w-0"
            style={
              isTwoColumnLayout
                ? { flex: "1 1 0%", minWidth: 320 }
                : undefined
            }
          >
            <div
              role="tablist"
              aria-label="Seções do produto"
              className="shrink-0 flex border-b border-border/50 bg-background/80 backdrop-blur-sm overflow-x-auto"
            >
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                    activeTab === id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {activeTab === "portfolio" ? (
                <div role="tabpanel" className="px-6 py-4">
                  <PortfolioGallery
                    images={(product as any).demonstrations ?? []}
                    productName={product.name}
                    coverImage={(product as any).image}
                  />
                </div>
              ) : activeTab === "nomades" && isAdmin ? (
                <div role="tabpanel" className="px-6 py-4">
                  <ProductNomadsTab productId={product?.id ?? ""} />
                </div>
              ) : (
                <div role="tabpanel" className="px-6 py-4 space-y-6">
                  {/* Sua seleção */}
                  {hasVariations && (
                    <div
                      className={cn(
                        "rounded-xl border p-3 transition-colors",
                        selectedVariation
                          ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20"
                          : "border-dashed border-border/70 bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap
                          className={cn(
                            "h-3.5 w-3.5",
                            selectedVariation ? "text-purple-600" : "text-muted-foreground",
                          )}
                        />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {selectedVariation ? "Sua seleção" : "Selecione uma opção ao lado"}
                        </p>
                        {selectedVariation && (
                          <span className="ml-auto text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {selectedVariation.name}
                          </span>
                        )}
                      </div>
                      {selectedVariation ? (
                        selectedVariation.features?.length > 0 ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1.5">
                            {selectedVariation.features.map((f: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                                <span className="text-foreground/90 leading-snug">{f}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Esta opção não possui diferenciais específicos cadastrados.
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Escolha uma opção ao lado para ver os diferenciais específicos dela aqui.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Para quem é */}
                  {pres?.targetAudience?.length > 0 && (
                    <Section icon={Target} title="Para quem é este produto?" color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/40">
                      <div className="space-y-2">
                        {pres.targetAudience.map((t: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <ChevronRight className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* O que está incluído */}
                  {pres?.whatIsIncluded?.length > 0 && (
                    <Section icon={Layers} title="O que está incluído" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                      <div className="space-y-2.5">
                        {pres.whatIsIncluded.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20 hover:bg-muted/30 transition-colors">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Incluído em todas as opções */}
                  {(product as any).baseFeatures?.length > 0 && (
                    <Section icon={CheckCircle2} title="Incluído em todas as opções" color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/40">
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
                          {(product as any).baseFeatures.map((bf: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-foreground/90 leading-snug">{bf}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Vantagens / Benefícios */}
                  {accountType === "empresas" ? (
                    <Section icon={Sparkles} title="Vantagens" color="text-yellow-600" bg="bg-yellow-100 dark:bg-yellow-900/40">
                      {pres?.benefits?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {pres.benefits.map((b: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                              <Sparkles className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold">{b.title}</p>
                                {b.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/40 dark:bg-yellow-950/20 px-4 py-5">
                          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 shrink-0">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Nenhuma vantagem cadastrada</p>
                            <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70 mt-0.5">
                              As vantagens deste produto aparecerão aqui quando forem configuradas.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.benefits?.length > 0 ? (
                    <Section icon={Sparkles} title="Benefícios" color="text-yellow-600" bg="bg-yellow-100 dark:bg-yellow-900/40">
                      <div className="grid grid-cols-1 gap-3">
                        {pres.benefits.map((b: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                            <Sparkles className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{b.title}</p>
                              {b.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* O que você recebe */}
                  {accountType === "empresas" ? (
                    <Section icon={ClipboardList} title="O que você recebe" color="text-teal-600" bg="bg-teal-100 dark:bg-teal-900/40">
                      {pres?.deliverables?.length > 0 ? (
                        <div className="space-y-1.5">
                          {pres.deliverables.map((d: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-teal-200 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/20 px-4 py-5">
                          <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 shrink-0">
                            <ClipboardList className="h-4 w-4 text-teal-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-teal-800 dark:text-teal-200">Entregas não especificadas</p>
                            <p className="text-xs text-teal-700/70 dark:text-teal-400/70 mt-0.5">
                              As entregas deste serviço aparecerão aqui quando forem configuradas.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.deliverables?.length > 0 ? (
                    <Section icon={ClipboardList} title="O que você recebe" color="text-teal-600" bg="bg-teal-100 dark:bg-teal-900/40">
                      <div className="space-y-1.5">
                        {pres.deliverables.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* Não incluído */}
                  {pres?.notIncluded?.length > 0 && (
                    <Section icon={XCircle} title="Não está incluído" color="text-slate-500" bg="bg-slate-100 dark:bg-slate-800">
                      <div className="space-y-1.5">
                        {pres.notIncluded.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Combine também com — produtos complementares */}
                  {(() => {
                    const linkedIds: string[] = (product as any).complementaryProductIds ?? [];
                    const linkedProducts = linkedIds
                      .map((id: string) => allProducts.find((p: any) => p.id === id))
                      .filter(Boolean);
                    const textComps: any[] = pres?.complementaryProducts ?? [];

                    if (linkedProducts.length === 0 && textComps.length === 0) return null;

                    return (
                      <Section icon={Link2} title="Combine também com" color="text-indigo-600" bg="bg-indigo-100 dark:bg-indigo-900/40">
                        <div className="space-y-2">
                          {linkedProducts.map((cp: any) => {
                            const cpHasVariations = (cp.variations ?? []).filter((v: any) => v.isActive !== false).length > 0;
                            const cpMinPrice = cpHasVariations
                              ? Math.min(...cp.variations.filter((v: any) => v.isActive !== false).map((v: any) => v.price || 0))
                              : cp.finalPrice || 0;
                            return (
                              <div key={cp.id} className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                                <div className="shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-linear-to-br from-indigo-500 to-purple-600 border border-indigo-100 dark:border-indigo-800">
                                  {cp.image ? (
                                    <img src={cp.image} alt={cp.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-5 w-5 text-white/70" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold leading-tight line-clamp-1">{cp.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-[10px] font-mono text-muted-foreground">{cp.id}</span>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground line-clamp-1">{cp.category}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                      {cpHasVariations ? "A partir de " : ""}
                                      {fmtBRL(cpMinPrice)}
                                      {cp.recurrence === "Mensal" ? "/mês" : ""}
                                    </span>
                                    {cp.recurrence && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700">
                                        {cp.recurrence}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {(onViewComplementaryProduct || onAddComplementaryProduct) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (cpHasVariations) {
                                        onViewComplementaryProduct?.(cp.id);
                                      } else {
                                        onAddComplementaryProduct?.({ ...cp, finalPrice: cpMinPrice });
                                      }
                                    }}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
                                  >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    {cpHasVariations ? "Ver opções" : "Adicionar"}
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {linkedProducts.length === 0 &&
                            textComps.map((cp: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                                <Package className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold">{cp.title}</p>
                                  {cp.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cp.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </Section>
                    );
                  })()}

                  {/* O que você precisa providenciar */}
                  {pres?.requirements?.length > 0 && (
                    <Section icon={AlertCircle} title="O que você precisa providenciar" color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/40">
                      <div className="space-y-1.5">
                        {pres.requirements.map((r: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Como contratar */}
                  {accountType === "empresas" ? (
                    <Section icon={Zap} title="Como contratar" color="text-purple-600" bg="bg-purple-100 dark:bg-purple-900/40">
                      {pres?.howToRequest?.length > 0 ? (
                        <div className="relative">
                          <div className="absolute left-4.75 top-6 bottom-4 w-px bg-border" />
                          {pres.howToRequest.map((s: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 relative pb-4 last:pb-0">
                              <span className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-purple-300 dark:border-purple-700 bg-background text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0 z-10">
                                {i + 1}
                              </span>
                              <div className="pt-2">
                                <p className="text-sm font-semibold">{s.step}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 px-4 py-5">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 shrink-0">
                            <Zap className="h-4 w-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Processo de contratação não disponível</p>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mt-0.5">
                              Selecione uma opção e clique em "Adicionar à cesta" para iniciar o processo de contratação deste serviço.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.howToRequest?.length > 0 ? (
                    <Section icon={Zap} title="Como contratar" color="text-purple-600" bg="bg-purple-100 dark:bg-purple-900/40">
                      <div className="relative">
                        <div className="absolute left-4.75 top-6 bottom-4 w-px bg-border" />
                        {pres.howToRequest.map((s: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 relative pb-4 last:pb-0">
                            <span className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-purple-300 dark:border-purple-700 bg-background text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0 z-10">
                              {i + 1}
                            </span>
                            <div className="pt-2">
                              <p className="text-sm font-semibold">{s.step}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* FAQ */}
                  {pres?.faq?.length > 0 && (
                    <Section icon={MessageCircle} title="Perguntas frequentes" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                      <div className="space-y-2">
                        {pres.faq.map((f: any, i: number) => (
                          <FaqItem key={i} question={f.question} answer={f.answer} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Briefing */}
                  {(product as any).questionnaire?.questions?.length > 0 && (
                    <Section icon={FileText} title="Briefing — Perguntas necessárias" color="text-teal-600" bg="bg-teal-100 dark:bg-teal-900/40">
                      <div className="space-y-2">
                        {(product as any).questionnaire.questions.map((q: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20">
                            <span className="flex-none h-6 w-6 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium leading-snug">{q.question}</p>
                              {q.warning && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                  {q.warning}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Prazos e processos */}
                  {(product as any).stages?.length > 0 && (
                    <Section icon={CalendarClock} title="Prazos e processos" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                      <div className="space-y-2">
                        {(product as any).stages.map((s: any, i: number) => (
                          <div key={i} className="rounded-xl border border-border/60 p-3.5 bg-muted/20 flex items-start gap-3">
                            <span className="flex-none h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                              {s.number ?? i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{s.name}</p>
                              {s.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {s.executionDeadlineDays != null && (
                                  <span className="text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                    Execução: até {s.executionDeadlineDays} dia{s.executionDeadlineDays > 1 ? "s" : ""} útil{s.executionDeadlineDays > 1 ? "is" : ""}
                                  </span>
                                )}
                                {s.approvalDeadlineDays != null && (
                                  <span className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                    Aprovação: até {s.approvalDeadlineDays} dias úteis
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(product as any).completion_time && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-sm text-blue-700 dark:text-blue-300 font-semibold">
                            <CalendarClock className="h-4 w-4 shrink-0" />
                            Prazo total: {(product as any).completion_time}
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Avisos importantes */}
                  {pres?.warnings?.length > 0 && (
                    <Section icon={AlertCircle} title="Avisos importantes" color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/40">
                      <div className="space-y-2">
                        {pres.warnings.map((w: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-sm">
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Tags */}
                  {product.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-border/40">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {product.tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── DIVISOR AJUSTÁVEL — só no desktop/tablet largo ──────── */}
          {isTwoColumnLayout && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar colunas de detalhes e contratação"
              aria-valuenow={Math.round(rightFraction * 100)}
              aria-valuemin={Math.round(MIN_RIGHT_FRACTION * 100)}
              aria-valuemax={Math.round(MAX_RIGHT_FRACTION * 100)}
              tabIndex={0}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingDivider(true);
              }}
              onDoubleClick={() => setRightFraction(DEFAULT_RIGHT_FRACTION)}
              onKeyDown={handleDividerKeyDown}
              className={cn(
                "hidden lg:flex order-2 shrink-0 relative group w-2.5 cursor-col-resize select-none items-center justify-center bg-border/40 hover:bg-purple-300 focus-visible:bg-purple-300 focus-visible:outline-none transition-colors",
                isDraggingDivider && "bg-purple-500 hover:bg-purple-500",
              )}
              title="Arraste para redimensionar (duplo clique ou Enter para restaurar; setas do teclado ajustam)"
            >
              <div
                className={cn(
                  "h-12 w-1 rounded-full bg-border group-hover:bg-purple-500 group-focus-visible:bg-purple-500 transition-colors flex items-center justify-center",
                  isDraggingDivider && "bg-white",
                )}
              >
                <GripVertical className="h-3 w-3 text-white/0 group-hover:text-white/80 -ml-1" />
              </div>
            </div>
          )}

          {/* ── PAINEL DE OPÇÕES E CONTRATAÇÃO ──────────────────────── */}
          <div
            className="shrink-0 order-1 lg:order-3 w-full border-b lg:border-b-0 lg:border-l border-border/50 flex flex-col bg-slate-50/60 dark:bg-slate-900/20 min-h-0"
            style={
              isTwoColumnLayout
                ? { flex: `0 0 ${rightFraction * 100}%`, width: `${rightFraction * 100}%`, minWidth: 280 }
                : undefined
            }
          >
            {/* Resumo compacto — preço, prazo, modalidade e limite em uma
                única faixa (não repete os badges do cabeçalho: aqui reflete
                a opção selecionada, que pode ter prazo/preço diferentes). */}
            <div
              className="shrink-0 px-4 py-3 text-white"
              style={{ background: "var(--app-brand-gradient, linear-gradient(135deg, #050816 0%, #1a2a6f 45%, #c81a7f 100%))" }}
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-lg font-extrabold leading-none">
                  {hasVariations && !selectedVariation ? "a partir de " : ""}
                  {fmtBRL(displayedPrice)}
                  {(product as any).recurrence === "Mensal" && (
                    <span className="text-xs font-medium text-blue-200 ml-0.5">/mês</span>
                  )}
                </span>
                {(selectedVariation?.deadlineDays || product.deliveryDays) && (
                  <>
                    <span className="text-white/25 text-xs" aria-hidden="true">|</span>
                    <span className="text-xs text-blue-200 whitespace-nowrap">
                      Prazo: <strong className="text-white font-semibold">{selectedVariation?.deadlineDays ?? product.deliveryDays} dias</strong>
                    </span>
                  </>
                )}
                {(product as any).recurrence && (
                  <>
                    <span className="text-white/25 text-xs" aria-hidden="true">|</span>
                    <span className="text-xs text-blue-200 whitespace-nowrap">
                      Modalidade: <strong className="text-white font-semibold">{(product as any).recurrence}</strong>
                    </span>
                  </>
                )}
                {(product as any).itemLimit && (
                  <>
                    <span className="text-white/25 text-xs" aria-hidden="true">|</span>
                    <span className="text-xs text-blue-200 whitespace-nowrap">
                      Contrato: <strong className="text-white font-semibold">{(product as any).itemLimit}</strong>
                    </span>
                  </>
                )}
              </div>
              {selectedVariation && (
                <p className="text-xs text-emerald-300 font-semibold mt-1 truncate">{selectedVariation.name}</p>
              )}
            </div>

            {/* Lista de opções — rolagem própria, resumo e ação continuam
                sempre visíveis fora dela. */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {hasVariations ? "Opções" : "Contratação"}
                  </h2>
                  {hasVariations && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {activeVariations.length} {activeVariations.length === 1 ? "opção" : "opções"}
                    </span>
                  )}
                </div>

                {hasVariations ? (
                  sortedVariations.map((v: any) => {
                    const isSel = selectedVariation?.id === v.id;
                    const isExpanded = expandedOptionId === v.id;
                    const campaignCount = parseCampaigns(v.name);
                    const platformCount = parsePlatforms(v.scopeDescription);
                    const pageCount = parsePages(v.name);
                    const deadlineLabel = getDeadlineLabel(v.name, v.deadlineDays, variationsInternal);
                    const features: string[] = v.features || [];
                    const hasExtraDetails = !!v.description || features.length > 0;

                    return (
                      <div
                        key={v.id}
                        className={cn(
                          "rounded-xl border-2 transition-all bg-background overflow-hidden",
                          isSel
                            ? "border-emerald-500 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900/40"
                            : "border-slate-200 dark:border-slate-700 hover:border-purple-300",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectVariation(isSel ? null : v)}
                          className="w-full text-left px-3 py-2.5 flex items-start gap-2.5"
                        >
                          {isSel ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold leading-tight truncate">{v.name}</p>
                              <span className={cn("text-sm font-extrabold shrink-0 leading-tight", isSel ? "text-emerald-600" : "text-foreground")}>
                                {fmtBRL(v.price)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {deadlineLabel && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <CalendarClock className="h-2 w-2" />
                                  {deadlineLabel}
                                </span>
                              )}
                              {(product as any).recurrence && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <Repeat2 className="h-2 w-2" />
                                  {(product as any).recurrence}
                                </span>
                              )}
                              {campaignCount && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                                  {campaignCount} campanhas
                                </span>
                              )}
                              {platformCount && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  {platformCount} plataformas
                                </span>
                              )}
                              {pageCount && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                  até {pageCount} páginas
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {hasExtraDetails && (
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOptionId(isExpanded ? null : v.id);
                            }}
                            className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-t border-border/40 px-3 py-1.5 hover:bg-muted/40 transition-colors"
                          >
                            {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}

                        {isExpanded && hasExtraDetails && (
                          <div className="px-3 pb-3 pt-2 border-t border-border/40 bg-muted/10 space-y-2">
                            {v.description && (
                              <p className="text-[11px] text-muted-foreground leading-snug">{v.description}</p>
                            )}
                            {features.length > 0 && (
                              <ul className="space-y-1">
                                {features.map((f: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center justify-between gap-3 bg-background">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">Contratação padrão</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
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
                    <span className="text-sm font-extrabold text-foreground shrink-0">{fmtBRL(displayedPrice)}</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* CTA fixo — uma única orientação, sem repetir a mensagem */}
            <div className="shrink-0 border-t border-border/50 bg-background px-4 py-3 space-y-2">
              {justAdded && (
                <div
                  role="status"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Adicionado à cesta.
                </div>
              )}
              {!alreadyInBasket && !canContratar && (
                <p className="text-[11px] text-muted-foreground text-center">Escolha uma opção acima para continuar</p>
              )}
              <Button
                size="lg"
                disabled={!canContratar || submitting || alreadyInBasket}
                onClick={handleContratar}
                className={cn(
                  "w-full gap-2 rounded-xl font-bold text-sm border-0 shadow-lg transition-all",
                  "h-auto min-h-9 py-2 whitespace-normal text-center leading-snug",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
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
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {alreadyInBasket ? "Já está na cesta" : !canContratar ? "Selecione uma opção" : "Adicionar à cesta"}
              </Button>
              {justAdded && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onBack}
                  className="w-full gap-2 rounded-xl font-semibold text-sm h-auto min-h-9 py-2 whitespace-normal text-center leading-snug"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  Continuar comprando
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
