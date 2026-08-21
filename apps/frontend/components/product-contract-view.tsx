import { useState } from "react";
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
  AlertCircle,
  MessageCircle,
  Tag,
  FileText,
  Images,
  Package,
  Link2,
  PlusCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { useAccountType } from "@/contexts/account-type-context";
import { useProducts, type Product } from "@/lib/contexts/product-context";
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
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { accountType } = useAccountType();
  const isAdmin = accountType === "admin";
  const { products: allProducts } = useProducts();

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
            CABEÇALHO — único, nome do produto como título, identidade e
            metadados essenciais. Nenhum segundo título/cabeçalho de página.
        ══════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao catálogo
              </button>

              <h1 className="text-xl font-bold leading-tight text-foreground mb-1.5">
                {product.name}
              </h1>

              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold tracking-wider uppercase">
                  {product.category || "Serviço"}
                </Badge>
                {hasVariations && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 border border-purple-200 dark:border-purple-700 font-semibold">
                    <Layers className="h-2.5 w-2.5" />
                    {activeVariations.length} {activeVariations.length === 1 ? "opção" : "opções"}
                  </span>
                )}
              </div>

              {pres?.tagline && (
                <div className="max-w-2xl">
                  <p
                    className={cn(
                      "text-xs text-muted-foreground leading-snug",
                      !descriptionExpanded && "line-clamp-2",
                    )}
                  >
                    {pres.tagline}
                  </p>
                  {pres.tagline.length > 140 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((v) => !v)}
                      className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
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
                      "text-xs text-muted-foreground leading-snug",
                      !descriptionExpanded && "line-clamp-2",
                    )}
                  >
                    {product.summaryDescription || product.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((v) => !v)}
                    className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                  >
                    {descriptionExpanded ? "Mostrar menos" : "Ver descrição completa"}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 tracking-widest">
                  {product.id}
                </span>
                {(product as any).recurrence && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <Repeat2 className="h-2.5 w-2.5" />
                    {(product as any).recurrence}
                  </span>
                )}
                {product.deliveryDays && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <CalendarClock className="h-2.5 w-2.5" />
                    {product.deliveryDays} dias
                  </span>
                )}
                {(product as any).itemLimit && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <Users className="h-2.5 w-2.5" />
                    {(product as any).itemLimit} contrato{(product as any).itemLimit !== 1 ? "s" : ""}
                  </span>
                )}
                <ProductRatingDisplay
                  productId={product.id}
                  size="xs"
                  showCount={true}
                  className="bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="shrink-0">
              <CopyLinkButton />
            </div>
          </div>

          {pres?.highlights?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Destaques
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {pres.highlights.map((h: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-[12px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-foreground/90 leading-snug">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CORPO — abas + conteúdo (principal) e opções/contratação
            (lateral no desktop, primeiro no mobile). Tudo dentro do mesmo
            container branco.
        ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col sm:flex-row">
          {/* ── ÁREA PRINCIPAL: abas + conteúdo informativo ─────────── */}
          <div className="flex flex-col min-h-0 flex-1 order-2 sm:order-1">
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
                <div role="tabpanel" className="px-7 py-5">
                  <PortfolioGallery
                    images={(product as any).demonstrations ?? []}
                    productName={product.name}
                    coverImage={(product as any).image}
                  />
                </div>
              ) : activeTab === "nomades" && isAdmin ? (
                <div role="tabpanel" className="px-7 py-5">
                  <ProductNomadsTab productId={product?.id ?? ""} />
                </div>
              ) : (
                <div role="tabpanel" className="px-7 py-5 space-y-6">
                  {/* Sua seleção */}
                  {hasVariations && (
                    <div
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        selectedVariation
                          ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20"
                          : "border-dashed border-border/70 bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap
                          className={cn(
                            "h-4 w-4",
                            selectedVariation ? "text-purple-600" : "text-muted-foreground",
                          )}
                        />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                              Selecione uma opção e clique em "Contratar" para iniciar o processo de contratação deste serviço.
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

          {/* ── PAINEL DE OPÇÕES E CONTRATAÇÃO ──────────────────────── */}
          <div className="shrink-0 order-1 sm:order-2 w-full sm:w-96 border-b sm:border-b-0 sm:border-l border-border/50 flex flex-col bg-slate-50/60 dark:bg-slate-900/20 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4 bg-linear-to-b from-slate-50 via-white to-slate-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                {/* Bloco de preço */}
                <div
                  className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_18px_50px_rgba(26,42,111,0.28)]"
                  style={{
                    background: "var(--app-brand-gradient, linear-gradient(135deg, #050816 0%, #1a2a6f 45%, #c81a7f 100%))",
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-10 right-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-fuchsia-300/15 blur-2xl" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-2">
                    {hasVariations && !selectedVariation
                      ? "A partir de"
                      : (product as any).recurrence === "Mensal"
                        ? "Valor mensal"
                        : "Valor do serviço"}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold leading-none">{fmtBRL(displayedPrice)}</span>
                    {(product as any).recurrence === "Mensal" && (
                      <span className="text-blue-300 text-sm font-medium">/mês</span>
                    )}
                  </div>
                  {selectedVariation && (
                    <p className="text-sm text-emerald-300 font-semibold mt-1.5">{selectedVariation.name}</p>
                  )}
                  {(selectedVariation?.deadlineDays || product.deliveryDays) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15 text-xs text-blue-200">
                      <CalendarClock className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      Prazo: <span className="font-semibold text-white">{selectedVariation?.deadlineDays ?? product.deliveryDays} dias</span>
                    </div>
                  )}
                  {(product as any).recurrence && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-200">
                      <Repeat2 className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>{(product as any).recurrence}</span>
                    </div>
                  )}
                </div>

                {/* Opções */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className={cn("h-4 w-4 shrink-0", selectedVariation ? "text-emerald-600" : "text-purple-600")} />
                      <h2 className="text-sm font-bold">
                        {hasVariations ? (selectedVariation ? "Opção selecionada" : "Escolha uma opção") : "Contratação"}
                      </h2>
                    </div>
                    {hasVariations && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {activeVariations.length} {activeVariations.length === 1 ? "opção" : "opções"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {hasVariations ? (
                      sortedVariations.map((v: any) => {
                        const isSel = selectedVariation?.id === v.id;
                        const campaignCount = parseCampaigns(v.name);
                        const platformCount = parsePlatforms(v.scopeDescription);
                        const pageCount = parsePages(v.name);
                        const deadlineLabel = getDeadlineLabel(v.name, v.deadlineDays, variationsInternal);
                        const features: string[] = v.features || [];

                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => selectVariation(isSel ? null : v)}
                            className={cn(
                              "w-full text-left rounded-2xl border-2 p-4 transition-all bg-background",
                              isSel
                                ? "border-emerald-500 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-900"
                                : "border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:shadow-sm",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                {isSel ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                                )}
                                <p className="text-sm font-bold leading-tight">{v.name}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={cn("text-base font-extrabold block leading-tight", isSel ? "text-emerald-600" : "text-foreground")}>
                                  {fmtBRL(v.price)}
                                </span>
                                {(product as any).recurrence === "Mensal" && (
                                  <span className="text-[10px] text-muted-foreground">/mês</span>
                                )}
                                {(product as any).recurrence === "Avulso e Mensal" && (
                                  <span className="text-[10px] text-muted-foreground">avulso ou /mês</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-2.5 ml-6">
                              {campaignCount && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                                  <Target className="h-2.5 w-2.5" />
                                  {campaignCount} campanhas
                                </span>
                              )}
                              {platformCount && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  <Layers className="h-2.5 w-2.5" />
                                  {platformCount} plataformas
                                </span>
                              )}
                              {pageCount && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                  <Target className="h-2.5 w-2.5" />
                                  até {pageCount} páginas
                                </span>
                              )}
                              {deadlineLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <CalendarClock className="h-2.5 w-2.5" />
                                  {deadlineLabel}
                                </span>
                              )}
                            </div>

                            {v.description && (
                              <p className="mt-2 ml-6 text-[11px] text-muted-foreground leading-snug line-clamp-2">{v.description}</p>
                            )}

                            {features.length > 0 && (
                              <ul className="mt-2.5 ml-6 space-y-1">
                                {features.map((f: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3 bg-background">
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
                        <span className="text-sm font-extrabold text-foreground shrink-0">{fmtBRL(displayedPrice)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(product as any).itemLimit && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 text-sm">
                    <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>
                      Limite de <strong>{(product as any).itemLimit} contrato{(product as any).itemLimit !== 1 ? "s" : ""}</strong> simultâneo{(product as any).itemLimit !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* CTA fixo */}
            <div className="shrink-0 border-t border-border/50 bg-background px-5 py-4 space-y-3">
              {justAdded && (
                <div
                  role="status"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Adicionado à cesta.
                </div>
              )}
              {hasVariations && !selectedVariation && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium leading-snug">Selecione uma opção acima para continuar</p>
                </div>
              )}
              <Button
                size="lg"
                disabled={!canContratar || submitting || alreadyInBasket}
                onClick={handleContratar}
                className={cn(
                  "w-full gap-2.5 rounded-2xl font-bold text-sm border-0 shadow-lg transition-all",
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
                <ShoppingCart className="h-4 w-4" />
                {alreadyInBasket ? "Já está na cesta" : !canContratar ? "Selecione uma opção para continuar" : "Contratar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
