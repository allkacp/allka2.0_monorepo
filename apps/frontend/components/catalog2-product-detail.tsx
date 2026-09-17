"use client";

// Detalhe COMPLETO do produto catalog2 — reparo 2026-09 ("restaurar o
// detalhe completo do produto, preços e imagens"). Reproduz a ESTRUTURA
// VISUAL do componente publicado em produção (f14e783 —
// product-contract-view.tsx): cabeçalho degradê com voltar/nome/copiar
// link/categoria/opções/código/status/descrição/destaques, abas
// Detalhes/Portfólio/Nômades, painel de opções e contratação. Os DADOS são
// 100% catalog2 — nada de lógica comercial do produto antigo é reutilizada
// aqui, só o layout (Section/FaqItem/PortfolioGallery/fmtBRL, que são
// utilitários puramente visuais, sem regra de negócio).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Layers,
  CalendarClock,
  Repeat2,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Images,
  Users,
  Zap,
  GripVertical,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { CopyLinkButton } from "@/components/copy-link-button";
import { fmtBRL, Section, PortfolioGallery } from "@/components/product-detail-shared";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { ProvisionalBadge } from "@/components/provisional-badge";
import { Catalog2PricingMemoryPopover } from "@/components/catalog2-pricing-memory-popover";
import { useIallkaContext } from "@/contexts/iallka-context";

type TabId = "detalhes" | "portfolio" | "nomades";

const DETAIL_PANEL_STORAGE_KEY = "allka:catalog2-detail-right-fraction-v1";
const DEFAULT_RIGHT_FRACTION = 0.58;
const MIN_RIGHT_FRACTION = 0.42;
const MAX_RIGHT_FRACTION = 0.68;

function clampRightFraction(value: number) {
  return Math.min(MAX_RIGHT_FRACTION, Math.max(MIN_RIGHT_FRACTION, value));
}

interface RealOption {
  id: string;
  key: string;
  variation_id: string;
  variation_name: string;
  name: string;
  price: number | null;
  deadline_days: number | null;
  modality: null;
  features: string[];
  is_provisional: false;
}
interface ProvisionalOption {
  id: string;
  name: string;
  price: number;
  deadline_days: number;
  modality: string;
  features: string[];
  is_provisional: true;
}

export function Catalog2ProductDetail({
  productId,
  onBack,
  onOpenEditor,
  isAdminMaster = false,
}: {
  productId: string;
  onBack: () => void;
  onOpenEditor?: () => void;
  isAdminMaster?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Distingue "produto não existe" (404 — repetir a chamada nunca vai
  // funcionar) de uma falha real/transitória da API (vale oferecer retry).
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("detalhes");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [highlightsExpanded, setHighlightsExpanded] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
  const [selectedAddonKeys, setSelectedAddonKeys] = useState<string[]>([]);
  const [selectionSimulation, setSelectionSimulation] = useState<any | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [rightFraction, setRightFraction] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_RIGHT_FRACTION;
    const saved = Number(window.localStorage.getItem(DETAIL_PANEL_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= MIN_RIGHT_FRACTION && saved <= MAX_RIGHT_FRACTION
      ? saved
      : DEFAULT_RIGHT_FRACTION;
  });

  useEffect(() => {
    const update = () => setIsWideLayout(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;
    const move = (event: MouseEvent) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
      const next = clampRightFraction((rect.right - event.clientX) / rect.width);
      setRightFraction(next);
    };
    const stop = () => setIsDraggingDivider(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, [isDraggingDivider]);

  useEffect(() => {
    window.localStorage.setItem(DETAIL_PANEL_STORAGE_KEY, String(rightFraction));
  }, [rightFraction]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    apiClient
      .getCatalog2ProductDetailPreview(productId)
      .then((res: any) => {
        if (!cancelled) setData(res);
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (e?.status === 404) {
          setNotFound(true);
          setError(e?.message || "Produto não encontrado.");
        } else {
          setError(e?.message || "Não foi possível carregar o detalhe do produto.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, retryToken]);

  const product = data?.product;
  const readiness = data?.readiness;
  const provisional = readiness?.provisional ?? null;

  // Contexto pra Aura (Item 9, reunião 2026-09-14, "Atualizar o contexto da
  // Aura") — nome já visível na própria tela + id real do produto
  // (revalidado/reautorizado no servidor, nunca confiado só por estar
  // aqui). Some ao sair da tela.
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();
  useEffect(() => {
    setIallkaScreenContext({
      label: "Catálogo de Produtos",
      openItemName: product?.internal_name,
      productId,
    });
    return () => setIallkaScreenContext(null);
  }, [product?.internal_name, productId, setIallkaScreenContext]);

  const targetVersion = useMemo(() => {
    if (!product?.versions?.length) return null;
    const published = product.versions.find((v: any) => v.id === product.published_version_id);
    return published ?? product.versions.find((v: any) => v.state === "rascunho") ?? product.versions[0];
  }, [product]);

  const realOptions: RealOption[] = useMemo(() => {
    const vars = targetVersion?.variations ?? [];
    const opts: RealOption[] = [];
    for (const v of vars) {
      for (const o of v.options ?? []) {
        opts.push({
          id: o.id,
          key: o.key,
          variation_id: v.id,
          variation_name: v.name,
          name: o.label,
          price: readiness?.price_amount ?? null,
          deadline_days: readiness?.deadline_days ?? null,
          modality: null,
          features: [],
          is_provisional: false,
        });
      }
    }
    return opts;
  }, [targetVersion, readiness]);

  const provisionalOptions: ProvisionalOption[] = useMemo(() => {
    if (realOptions.length > 0 || !provisional?.options) return [];
    return provisional.options.map((o: any, i: number) => ({
      id: `provisional-${i}`,
      name: o.name,
      price: o.price,
      deadline_days: o.deadline_days,
      modality: o.modality,
      features: o.features ?? [],
      is_provisional: true as const,
    }));
  }, [realOptions, provisional]);

  const hasRealOptions = realOptions.length > 0;
  const options = hasRealOptions ? realOptions : provisionalOptions;
  const selectedOption = options.find((o) => o.id === selectedOptionId || (!o.is_provisional && selectedOptionKeys.includes((o as RealOption).key))) ?? null;

  useEffect(() => {
    if (!targetVersion) return;
    const defaults = (targetVersion.variations ?? []).flatMap((variation: any) => {
      const option = variation.options?.find((item: any) => item.is_default) ?? variation.options?.[0];
      return option?.key ? [option.key] : [];
    });
    setSelectedOptionKeys(defaults);
    setSelectedAddonKeys((targetVersion.addons ?? []).filter((addon: any) => addon.is_default_selected).map((addon: any) => addon.key));
  }, [targetVersion?.id]);

  useEffect(() => {
    if (!targetVersion?.id || !hasRealOptions) {
      setSelectionSimulation(null);
      return;
    }
    let cancelled = false;
    apiClient.simulateCatalog2(targetVersion.id, {
      variation_option_keys: selectedOptionKeys,
      addon_keys: selectedAddonKeys,
      quantity: 1,
      answers: {},
    }).then((result: any) => {
      if (!cancelled) setSelectionSimulation(result.pricing_simulation ?? result.pricing ?? null);
    }).catch(() => {
      if (!cancelled) setSelectionSimulation(null);
    });
    return () => { cancelled = true; };
  }, [targetVersion?.id, hasRealOptions, selectedOptionKeys, selectedAddonKeys]);

  const selectedCalculatedPrice = selectionSimulation?.lines?.commercial_final_price?.amount ?? selectionSimulation?.lines?.final_price?.amount ?? null;
  const displayPrice = selectedCalculatedPrice ?? selectedOption?.price ?? readiness?.price_amount ?? readiness?.pricing_simulation?.price_amount ?? provisional?.price_amount ?? null;
  const priceIsProvisional = !readiness?.price_amount && displayPrice != null;
  const selectedCalculatedDeadline = selectionSimulation?.deadline?.commercial_deadline_days ?? selectionSimulation?.estimated_deadline_days ?? null;
  const displayDeadline = selectedCalculatedDeadline ?? selectedOption?.deadline_days ?? readiness?.deadline_days ?? readiness?.pricing_simulation?.deadline_days ?? provisional?.deadline_days ?? null;
  const deadlineIsProvisional = !readiness?.deadline_days && displayDeadline != null;
  const modality = provisional?.modality ?? null;

  const tasks = targetVersion?.tasks ?? [];
  const hasRealTasks = tasks.length > 0;
  const includedItems = hasRealTasks
    ? tasks.map((t: any) => ({ title: t.name, description: t.description, real: true, effort_is_provisional: !!t.effort_is_provisional }))
    : (provisional?.included_items ?? []).map((it: any) => ({ ...it, real: false, effort_is_provisional: false }));

  const highlights: { text: string; real: boolean }[] = provisional?.highlights?.map((h: string) => ({ text: h, real: false })) ?? [];

  const imagePath = provisional?.image_path ?? null;
  const portfolioImages: string[] = provisional?.portfolio_refs ?? [];

  const specialties = useMemo(() => {
    const names = new Set<string>();
    for (const t of tasks) if (t.specialty?.name) names.add(t.specialty.name);
    return Array.from(names);
  }, [tasks]);

  // Bloqueio de contratação: NUNCA liberado nesta tela (é preview
  // administrativo). Além disso, o produto real segue com as mesmas regras
  // de sempre (client_visible/commercial_ready) — esta tela nunca chama
  // createQuote/addToCart, então não há caminho de bypass mesmo que a UI
  // permita "selecionar" uma opção só para conferência visual.
  const blockedReason = "Produto em preparação. Dados provisórios precisam ser revisados antes da contratação.";

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "detalhes", label: "Detalhes", icon: FileText },
    { id: "portfolio", label: "Portfólio", icon: Images },
    { id: "nomades", label: "Nômades", icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-sm text-muted-foreground">Carregando detalhe do produto…</div>
    );
  }
  if (error || !product) {
    const canRetry = !!error && !notFound;
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center px-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error || "Produto não encontrado."}</p>
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button variant="outline" onClick={() => setRetryToken((n) => n + 1)}>Tentar novamente</Button>
          )}
          <Button variant={canRetry ? "ghost" : "outline"} onClick={onBack}>Voltar</Button>
        </div>
      </div>
    );
  }

  const hasProvisionalFields = !readiness?.price_amount || !readiness?.deadline_days || !hasRealTasks || !imagePath;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* ── Cabeçalho institucional ─────────────────────────────────── */}
      <div className="shrink-0 relative overflow-hidden mb-3 rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]">
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }} />
        <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors mb-2.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao catálogo
              </button>
              <div className="flex items-center gap-2 shrink-0 -mt-1 -mr-1">
                {onOpenEditor && (
                  <button type="button" onClick={onOpenEditor} className="text-[11px] font-semibold text-white/80 hover:text-white underline underline-offset-2">
                    Abrir no construtor
                  </button>
                )}
                <CopyLinkButton />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <Catalog2Thumbnail productId={product.id} imagePath={imagePath} size="sm" showBadge={false} />
              <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white">{product.internal_name}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-white uppercase tracking-wider">
                {product.category?.name || "Sem categoria"}
              </span>
              {options.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                  <Layers className="h-2.5 w-2.5" />
                  {options.length} {options.length === 1 ? "opção" : "opções"}
                  {!hasRealOptions && <span className="ml-1 opacity-80">(provisórias)</span>}
                </span>
              )}
              <span className="inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white/80 tracking-widest">
                {product.slug}
              </span>
              {modality && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                  <Repeat2 className="h-2.5 w-2.5" />
                  {modality} <span className="opacity-70">(provisório)</span>
                </span>
              )}
              {displayDeadline != null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90">
                  <CalendarClock className="h-2.5 w-2.5" />
                  {displayDeadline} dias {deadlineIsProvisional && <span className="opacity-70">(provisório)</span>}
                </span>
              )}
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white/90 uppercase">
                {product.status === "disponivel" ? "Disponível" : "Em preparação"}
              </span>
            </div>

            {(targetVersion?.summary || targetVersion?.full_description) && (
              <div className="max-w-2xl">
                <p className={cn("text-xs text-white/75 leading-snug", descriptionExpanded ? "max-h-32 overflow-y-auto pr-1" : "line-clamp-2")}>
                  {descriptionExpanded ? (targetVersion.full_description || targetVersion.summary) : targetVersion.summary || targetVersion.full_description}
                </p>
                <button type="button" onClick={() => setDescriptionExpanded((v) => !v)} className="mt-1 text-[11px] font-semibold text-white hover:underline">
                  {descriptionExpanded ? "Mostrar menos" : "Ver descrição completa"}
                </button>
              </div>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="lg:w-72 shrink-0 lg:border-l lg:border-white/15 lg:pl-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/15">
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Destaques</p>
                <span className="text-[9px] text-white/50">(provisórios)</span>
              </div>
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-1", highlightsExpanded && "max-h-40 overflow-y-auto pr-1")}>
                {(highlightsExpanded ? highlights : highlights.slice(0, 4)).map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[12px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0 mt-0.5" />
                    <span className="text-white/90 leading-snug">{h.text}</span>
                  </div>
                ))}
              </div>
              {highlights.length > 4 && (
                <button type="button" onClick={() => setHighlightsExpanded((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:underline">
                  {highlightsExpanded ? <>Mostrar menos <ChevronUp className="h-3 w-3" /></> : <>Ver todos os destaques <ChevronDown className="h-3 w-3" /></>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {hasProvisionalFields && (
        <div className="shrink-0 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-300">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Este produto ainda tem campos provisórios (marcados ao longo da tela). Nenhum valor provisório entra em cotação, cesta ou checkout.</span>
        </div>
      )}

      {/* ── Corpo: abas + opções ────────────────────────────────────── */}
      <div ref={bodyRef} className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="flex flex-col min-h-0 order-2 lg:order-1 min-w-0 flex-1 bg-background">
          <div role="tablist" aria-label="Seções do produto" className="shrink-0 flex border-b border-border/50 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                  activeTab === id ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
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
                <PortfolioGallery images={portfolioImages} productName={product.internal_name} coverImage={imagePath ?? undefined} />
                {portfolioImages.length > 0 && (
                  <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Portfólio provisório — referência de visualização, não representa entregas definitivas deste produto.
                  </p>
                )}
              </div>
            ) : activeTab === "nomades" ? (
              <div role="tabpanel" className="px-6 py-4 space-y-4">
                <Section icon={Users} title="Nômades — especialidades e elegibilidade" color="text-indigo-600" bg="bg-indigo-100 dark:bg-indigo-900/40">
                  {specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {specialties.map((s) => (
                        <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Especialidades necessárias: a definir (produto ainda sem tarefas cadastradas).</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">Quantidade de profissionais elegíveis: a definir — este produto ainda não tem regra de elegibilidade vinculada no catalog2.</p>
                </Section>
              </div>
            ) : (
              <div role="tabpanel" className="px-6 py-4 space-y-6">
                {options.length > 0 && (
                  <div className={cn("rounded-xl border p-3", selectedOption ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20" : "border-dashed border-border/70 bg-muted/30")}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className={cn("h-3.5 w-3.5", selectedOption ? "text-purple-600" : "text-muted-foreground")} />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {selectedOption ? "Sua seleção" : "Selecione uma opção ao lado"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedOption ? `${selectedOption.name} — apenas para conferência visual, nenhuma seleção aqui altera cotação, cesta ou checkout.` : "Escolha uma opção no painel ao lado para ver os diferenciais dela aqui."}
                    </p>
                  </div>
                )}

                <Section icon={Layers} title="O que está incluído" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                  {includedItems.length > 0 ? (
                    <div className="space-y-2.5">
                      {includedItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{item.title}</p>
                              {!item.real && <ProvisionalBadge label="Item provisório — completar com tarefas reais no construtor." />}
                              {item.real && item.effort_is_provisional && (
                                <ProvisionalBadge label="Especialidade e tempo provisórios para teste — revisão humana pendente. Nunca usado para aprovar preço comercial." />
                              )}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa cadastrada ainda.</p>
                  )}
                </Section>

                {readiness?.step_count > 0 && (
                  <Section icon={CalendarClock} title="Detalhamento das entregas" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                    <p className="text-sm text-muted-foreground">{readiness.step_count} etapa(s) cadastrada(s) nas tarefas deste produto (ver detalhamento completo no construtor).</p>
                  </Section>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {isWideLayout && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar colunas de detalhes e opções"
            aria-valuenow={Math.round(rightFraction * 100)}
            tabIndex={0}
            onMouseDown={(event) => { event.preventDefault(); setIsDraggingDivider(true); }}
            onDoubleClick={() => setRightFraction(DEFAULT_RIGHT_FRACTION)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") setRightFraction((v) => clampRightFraction(v + 0.02));
              if (event.key === "ArrowRight") setRightFraction((v) => clampRightFraction(v - 0.02));
              if (event.key === "Enter") setRightFraction(DEFAULT_RIGHT_FRACTION);
            }}
            className={cn("order-2 hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center border-x border-border/50 bg-muted/40 hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500", isDraggingDivider && "bg-purple-300")}
            title="Arraste para ajustar as colunas; duplo clique restaura"
          >
            <GripVertical className="h-4 w-4 text-purple-500" />
          </div>
        )}

        {/* ── Painel de opções e contratação ─────────────────────────── */}
        <div
          className="shrink-0 order-1 lg:order-3 w-full flex flex-col bg-slate-50/60 dark:bg-slate-900/20 min-h-0"
          style={isWideLayout ? { flex: `0 0 ${rightFraction * 100}%`, width: `${rightFraction * 100}%`, minWidth: 360 } : undefined}
        >
          <div className="shrink-0 px-5 py-3 text-white" style={{ background: "linear-gradient(135deg, #050816 0%, #1a2a6f 45%, #c81a7f 100%)" }}>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-lg font-extrabold leading-none">
                {displayPrice != null ? (
                  <>
                    {!selectedOption && "a partir de "}
                    {fmtBRL(displayPrice)}
                  </>
                ) : (
                  "Preço a definir"
                )}
              </span>
              {priceIsProvisional && displayPrice != null && <span className="text-[10px] text-amber-300 font-semibold">(provisório — revisar)</span>}
              {isAdminMaster && (
                <Catalog2PricingMemoryPopover
                  productId={productId}
                  isAdminMaster={isAdminMaster}
                  provisionalPriceAmount={priceIsProvisional ? displayPrice : undefined}
                  variant="dark"
                />
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-blue-200">
              {displayDeadline != null && <span>Prazo: <strong className="text-white">{displayDeadline} dias</strong>{deadlineIsProvisional && " (provisório)"}</span>}
              {modality && <><span className="text-white/30">|</span><span>Modalidade: <strong className="text-white">{modality}</strong></span></>}
              {options.length > 0 && <><span className="text-white/30">|</span><span><strong className="text-white">{options.length}</strong> {options.length === 1 ? "opção" : "opções"}</span></>}
            </div>
            {readiness?.functional_for_test && (
              <p className="mt-1.5 rounded-md bg-amber-400/20 px-2 py-1 text-[11px] font-medium text-amber-100">
                {readiness.functional_for_test_label ?? "Funcional para teste, pendente de revisão"} — especialidade e tempo das tarefas são provisórios para teste.
              </p>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Opções</h2>
                {!hasRealOptions && options.length > 0 && <span className="text-[10px] text-amber-600 font-semibold">provisórias</span>}
              </div>

              {options.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhuma opção cadastrada ainda.</p>}

              {options.map((o) => {
                const isSel = o.is_provisional ? selectedOptionId === o.id : selectedOptionKeys.includes((o as RealOption).key);
                const isExpanded = expandedOptionId === o.id;
                return (
                  <div key={o.id} className={cn("rounded-xl border-2 transition-all bg-background overflow-hidden", isSel ? "border-emerald-500 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900/40" : "border-slate-200 dark:border-slate-700 hover:border-purple-300")}>
                    <button type="button" onClick={() => {
                      setSelectedOptionId(isSel ? null : o.id);
                      if (!o.is_provisional) {
                        const real = o as RealOption;
                        const siblingKeys = realOptions.filter((item) => item.variation_id === real.variation_id).map((item) => item.key);
                        setSelectedOptionKeys((current) => [...current.filter((key) => !siblingKeys.includes(key)), real.key]);
                      }
                    }} className="w-full text-left px-3 py-2.5 flex items-start gap-2.5">
                      {isSel ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {!o.is_provisional && <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{(o as RealOption).variation_name}</p>}
                            <p className="text-xs font-bold leading-tight truncate">{o.name}</p>
                          </div>
                          <span className={cn("text-sm font-extrabold shrink-0 leading-tight", isSel ? "text-emerald-600" : "text-foreground")}>
                            {o.price != null ? fmtBRL(o.price) : "—"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.deadline_days != null && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <CalendarClock className="h-2 w-2" />
                              {o.deadline_days} dias
                            </span>
                          )}
                          {o.modality && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Repeat2 className="h-2 w-2" />
                              {o.modality}
                            </span>
                          )}
                          {!o.is_provisional ? null : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                              provisória
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {o.features.length > 0 && (
                      <>
                        <button type="button" aria-expanded={isExpanded} onClick={(e) => { e.stopPropagation(); setExpandedOptionId(isExpanded ? null : o.id); }} className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-t border-border/40 px-3 py-1.5 hover:bg-muted/40 transition-colors">
                          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-2 border-t border-border/40 bg-muted/10 space-y-1">
                            {o.features.map((f, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                                <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />
                                {f}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {(targetVersion?.addons ?? []).length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Adicionais</h2>
                    <span className="text-[10px] text-amber-600">valores provisórios quando indicado</span>
                  </div>
                  {(targetVersion.addons ?? []).filter((addon: any) => addon.is_active !== false).map((addon: any) => {
                    const checked = selectedAddonKeys.includes(addon.key);
                    return (
                      <label key={addon.id} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border bg-background px-3 py-2.5 transition-colors", checked ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20" : "border-border/70 hover:border-purple-300")}>
                        <input type="checkbox" className="mt-0.5" checked={checked} onChange={(event) => setSelectedAddonKeys((current) => event.target.checked ? [...current, addon.key] : current.filter((key) => key !== addon.key))} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">{addon.name}</span>
                          {addon.description && <span className="mt-0.5 block text-[11px] text-muted-foreground">{addon.description}</span>}
                        </span>
                        {addon.base_cost != null && <span className="text-xs font-semibold">+ {fmtBRL(addon.base_cost)}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 p-3 border-t border-border/50 space-y-2">
            <Button type="button" disabled className="w-full gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-fuchsia-700 text-white" title={blockedReason}>
              <ShoppingCart className="h-4 w-4" />
              {selectedOption ? "Opção selecionada — contratação bloqueada" : "Selecione uma opção"}
            </Button>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              {blockedReason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
