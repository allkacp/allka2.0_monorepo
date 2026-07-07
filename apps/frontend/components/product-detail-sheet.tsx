// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ChevronRight,
  ShoppingCart,
  AlertCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  ClipboardList,
  Target,
  Zap,
  Tag,
  CalendarClock,
  Repeat2,
  X,
  ChevronLeft,
  Images,
  FileText,
  Sparkles,
  Package,
  Link2,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlidePanel } from "@/components/slide-panel";
import { useAccountType } from "@/contexts/account-type-context";
import { useProducts } from "@/lib/contexts/product-context";
import { ProductNomadsTab } from "@/components/admin/product-nomads-tab";
import { ProductRatingDisplay } from "@/components/product-rating-display";
import { CopyLinkButton } from "@/components/copy-link-button";

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

// Extrai quantidade de plataformas do scopeDescription ("em até X plataformas")
function parsePlatforms(scope: string | undefined): string | null {
  if (!scope) return null;
  const m = scope.match(/em até (\d+) plataforma/i);
  return m ? m[1] : null;
}

// Extrai quantidade de campanhas do nome da variação ("Até X campanhas")
function parseCampaigns(name: string): string | null {
  const m = name.match(/[Aa]té (\d+) campanha/i);
  return m ? m[1] : null;
}

// Extrai quantidade de páginas do nome da variação ("Até X páginas")
function parsePages(name: string): string | null {
  const m = name.match(/[Aa]té (\d+) página/i);
  return m ? m[1] : null;
}

// Retorna o label de prazo público correto (ex: "28 dias úteis") usando
// variationsInternal do produto pai, com fallback para "{n} dias".
function getDeadlineLabel(
  name: string,
  days: number | undefined,
  variationsInternal: Record<string, any>,
): string | null {
  if (!days) return null;
  const entry = Object.values(variationsInternal).find(
    (v: any) => v.label === name,
  ) as any;
  if (entry?.publicDeadlineLabel) return entry.publicDeadlineLabel;
  return `${days} dias`;
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10">
          <p className="pt-3">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  color = "text-blue-600",
  bg = "bg-blue-100 dark:bg-blue-900/40",
  children,
}: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            bg,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", color)} />
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Portfolio Gallery ────────────────────────────────────────────────────────
function PortfolioGallery({
  images,
  productName,
  coverImage,
}: {
  images: string[];
  productName: string;
  coverImage?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Merge cover image + demonstrations (deduplicated)
  const allImages = Array.from(
    new Set([...(coverImage ? [coverImage] : []), ...images]),
  );

  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx < allImages.length - 1;

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Images className="h-8 w-8 opacity-40" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">
            Nenhuma imagem de portfólio ainda
          </p>
          <p className="text-xs text-slate-400 mt-1">
            As imagens serão adicionadas conforme os trabalhos forem concluídos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Main image ── */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-border/50 shadow-sm group">
        <img
          key={activeIdx}
          src={allImages[activeIdx]}
          alt={`${productName} — portfólio ${activeIdx + 1}`}
          className="w-full object-contain max-h-85 min-h-55"
          style={{
            background: "linear-gradient(135deg,#0f1f5c,#1a2a6f,#7b1850)",
          }}
        />

        {/* Counter badge */}
        <span className="absolute top-3 right-3 text-[11px] font-bold bg-black/50 text-white backdrop-blur-sm rounded-full px-2.5 py-1">
          {activeIdx + 1} / {allImages.length}
        </span>

        {/* Prev / Next navigation — always visible on hover */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={!hasPrev}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all",
                "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm",
                !hasPrev && "opacity-30 cursor-not-allowed",
              )}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIdx((i) => Math.min(allImages.length - 1, i + 1))
              }
              disabled={!hasNext}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all",
                "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm",
                !hasNext && "opacity-30 cursor-not-allowed",
              )}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnails ── */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all",
                i === activeIdx
                  ? "border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-900"
                  : "border-border/40 hover:border-slate-400 opacity-60 hover:opacity-100",
              )}
            >
              <img
                src={src}
                alt={`Miniatura ${i + 1}`}
                className="w-full h-full object-cover"
                style={{
                  background: "linear-gradient(135deg,#0f1f5c,#1a2a6f)",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Dot navigation ── */}
      {allImages.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {allImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "rounded-full transition-all",
                i === activeIdx
                  ? "w-4 h-1.5 bg-blue-500"
                  : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400",
              )}
              aria-label={`Ir para imagem ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Coming soon note ── */}
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3 flex items-center gap-3">
        <Images className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Este portfólio será enriquecido com cases e resultados reais conforme
          os trabalhos forem concluídos pela plataforma.
        </p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProductDetailSheetProps {
  product: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd?: (product: any) => void;
  isSelected?: boolean;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onAdd,
  isSelected = false,
}: ProductDetailSheetProps) {
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<
    "detalhes" | "portfolio" | "nomades"
  >("detalhes");
  const [nestedDetailProduct, setNestedDetailProduct] = useState<any | null>(
    null,
  );
  const { accountType } = useAccountType();
  const isAdmin = accountType === "admin";
  const { products: allProducts } = useProducts();

  // Painel direito redimensionável — fração (0–1) da largura do drawer
  const [rightFraction, setRightFraction] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setSelectedVariation(null);
      setActiveTab("detalhes");
      setNestedDetailProduct(null);
    }
  }, [open]);

  // Drag handlers para o resizer vertical
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const drawer = drawerRef.current;
      if (!drawer) return;
      const rect = drawer.getBoundingClientRect();
      // distância da direita do drawer até o cursor
      const fromRight = rect.right - e.clientX;
      const fraction = fromRight / rect.width;
      // limita entre 25% e 75%
      const clamped = Math.min(0.75, Math.max(0.25, fraction));
      setRightFraction(clamped);
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  if (!product) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const pres = product.presentation;
  const hasPresentation = !!pres;

  const activeVariations = (product.variations || []).filter(
    (v: any) => v.isActive !== false,
  );
  const hasVariations = activeVariations.length > 0;
  const sortedVariations = [...activeVariations].sort(
    (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0),
  );

  // Dados internos por variação (publicDeadlineLabel, horas, etc.)
  const variationsInternal: Record<string, any> =
    (product as any).variationsInternal ?? {};

  const displayedPrice = selectedVariation
    ? selectedVariation.price
    : hasVariations
      ? Math.min(...activeVariations.map((v: any) => v.price || 0))
      : product.finalPrice || 0;

  const canAdd = !hasVariations || !!selectedVariation;

  return (
    <>
      <SlidePanel
        open={open}
        onClose={handleClose}
        title={product.name}
        subtitle={product.category || undefined}
        widthMode="full"
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
          {/* ══════════════════════════════════════════════════════════════
              IDENTITY BAR — categoria, variações, descrição, chips, destaques
          ══════════════════════════════════════════════════════════════ */}
          <div className="shrink-0 px-6 pt-4 pb-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold tracking-wider uppercase">
                    {product.category || "Serviço"}
                  </Badge>
                  {hasVariations && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 border border-purple-200 dark:border-purple-700 font-semibold">
                      <Layers className="h-2.5 w-2.5" />
                      {activeVariations.length}{" "}
                      {activeVariations.length === 1 ? "opção" : "opções"}
                    </span>
                  )}
                </div>

                {pres?.tagline && (
                  <p className="text-xs text-muted-foreground leading-snug max-w-2xl">
                    {pres.tagline}
                  </p>
                )}
                {!hasPresentation &&
                  (product.summaryDescription || product.description) && (
                    <p className="text-xs text-muted-foreground leading-snug max-w-2xl line-clamp-2">
                      {product.summaryDescription || product.description}
                    </p>
                  )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 tracking-widest">
                    {product.id}
                  </span>
                  {product.recurrence && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <Repeat2 className="h-2.5 w-2.5" />
                      {product.recurrence}
                    </span>
                  )}
                  {product.deliveryDays && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <CalendarClock className="h-2.5 w-2.5" />
                      {product.deliveryDays} dias
                    </span>
                  )}
                  {product.itemLimit && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <Users className="h-2.5 w-2.5" />
                      {product.itemLimit} contrato
                      {product.itemLimit !== 1 ? "s" : ""}
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

              <div className="flex items-center gap-1.5 shrink-0">
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
            BODY — duas colunas com handle de resize entre elas
        ══════════════════════════════════════════════════════════════ */}
        <div
          ref={drawerRef}
          className="flex flex-1 min-h-0 overflow-hidden flex-col sm:flex-row"
        >
          {/* ── COLUNA ESQUERDA: conteúdo descritivo ─────────────── */}
          <div
            className="flex flex-col min-h-0 order-2 sm:order-1"
            style={{
              flex: `0 0 calc(100% - ${rightFraction * 100}%)`,
              width: `calc(100% - ${rightFraction * 100}%)`,
            }}
          >
            {/* ── Tab navigation ── */}
            <div className="shrink-0 flex border-b border-border/50 bg-background/80 backdrop-blur-sm">
              {[
                { id: "detalhes" as const, label: "Detalhes", icon: FileText },
                { id: "portfolio" as const, label: "Portfólio", icon: Images },
                ...(isAdmin
                  ? [{ id: "nomades" as const, label: "Nômades", icon: Users }]
                  : []),
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all",
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

            {/* ── Tab content ── */}
            <ScrollArea className="flex-1 min-h-0">
              {activeTab === "portfolio" ? (
                <div className="px-7 py-5">
                  <PortfolioGallery
                    images={(product as any).demonstrations ?? []}
                    productName={product.name}
                    coverImage={(product as any).image}
                  />
                </div>
              ) : activeTab === "nomades" && isAdmin ? (
                <div className="px-7 py-5">
                  <ProductNomadsTab productId={product?.id ?? ""} />
                </div>
              ) : (
                <div className="px-7 py-5 space-y-6">
                  {/* Sua seleção — reflete a variação escolhida no painel direito */}
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
                            selectedVariation
                              ? "text-purple-600"
                              : "text-muted-foreground",
                          )}
                        />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {selectedVariation
                            ? "Sua seleção"
                            : "Selecione uma opção ao lado"}
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
                            {selectedVariation.features.map(
                              (f: string, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                                  <span className="text-foreground/90 leading-snug">
                                    {f}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Esta opção não possui diferenciais específicos
                            cadastrados.
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Escolha uma opção no painel à direita para ver os
                          diferenciais específicos dela aqui.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Para quem é */}
                  {pres?.targetAudience?.length > 0 && (
                    <Section
                      icon={Target}
                      title="Para quem é este produto?"
                      color="text-violet-600"
                      bg="bg-violet-100 dark:bg-violet-900/40"
                    >
                      <div className="space-y-2">
                        {pres.targetAudience.map((t: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 text-sm"
                          >
                            <ChevronRight className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* O que está incluído */}
                  {pres?.whatIsIncluded?.length > 0 && (
                    <Section
                      icon={Layers}
                      title="O que está incluído"
                      color="text-blue-600"
                      bg="bg-blue-100 dark:bg-blue-900/40"
                    >
                      <div className="space-y-2.5">
                        {pres.whatIsIncluded.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Incluído em todas as opções — base estrutural compartilhada */}
                  {(product as any).baseFeatures?.length > 0 && (
                    <Section
                      icon={CheckCircle2}
                      title="Incluído em todas as opções"
                      color="text-emerald-600"
                      bg="bg-emerald-100 dark:bg-emerald-900/40"
                    >
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
                          {(product as any).baseFeatures.map(
                            (bf: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-foreground/90 leading-snug">
                                  {bf}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Vantagens (company) / Benefícios (outros perfis) */}
                  {accountType === "empresas" ? (
                    <Section
                      icon={Sparkles}
                      title="Vantagens"
                      color="text-yellow-600"
                      bg="bg-yellow-100 dark:bg-yellow-900/40"
                    >
                      {pres?.benefits?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {pres.benefits.map((b: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                            >
                              <Sparkles className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold">{b.title}</p>
                                {b.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {b.description}
                                  </p>
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
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Nenhuma vantagem cadastrada
                            </p>
                            <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70 mt-0.5">
                              As vantagens deste produto aparecerão aqui quando forem configuradas.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.benefits?.length > 0 ? (
                    <Section
                      icon={Sparkles}
                      title="Benefícios"
                      color="text-yellow-600"
                      bg="bg-yellow-100 dark:bg-yellow-900/40"
                    >
                      <div className="grid grid-cols-1 gap-3">
                        {pres.benefits.map((b: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                          >
                            <Sparkles className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{b.title}</p>
                              {b.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {b.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* Entregas */}
                  {accountType === "empresas" ? (
                    <Section
                      icon={ClipboardList}
                      title="O que você recebe"
                      color="text-teal-600"
                      bg="bg-teal-100 dark:bg-teal-900/40"
                    >
                      {pres?.deliverables?.length > 0 ? (
                        <div className="space-y-1.5">
                          {pres.deliverables.map((d: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2.5 text-sm"
                            >
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
                            <p className="text-sm font-medium text-teal-800 dark:text-teal-200">
                              Entregas não especificadas
                            </p>
                            <p className="text-xs text-teal-700/70 dark:text-teal-400/70 mt-0.5">
                              As entregas deste serviço aparecerão aqui quando forem configuradas.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.deliverables?.length > 0 ? (
                    <Section
                      icon={ClipboardList}
                      title="O que você recebe"
                      color="text-teal-600"
                      bg="bg-teal-100 dark:bg-teal-900/40"
                    >
                      <div className="space-y-1.5">
                        {pres.deliverables.map((d: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* Não incluído */}
                  {pres?.notIncluded?.length > 0 && (
                    <Section
                      icon={XCircle}
                      title="Não está incluído"
                      color="text-slate-500"
                      bg="bg-slate-100 dark:bg-slate-800"
                    >
                      <div className="space-y-1.5">
                        {pres.notIncluded.map((d: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground"
                          >
                            <XCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Produtos complementares — reais (IDs vinculados) + fallback textual */}
                  {(() => {
                    const linkedIds: string[] =
                      (product as any).complementaryProductIds ?? [];
                    const linkedProducts = linkedIds
                      .map((id: string) =>
                        allProducts.find((p: any) => p.id === id),
                      )
                      .filter(Boolean);
                    const textComps: any[] = pres?.complementaryProducts ?? [];

                    if (linkedProducts.length === 0 && textComps.length === 0)
                      return null;

                    return (
                      <Section
                        icon={Link2}
                        title="Combine também com"
                        color="text-indigo-600"
                        bg="bg-indigo-100 dark:bg-indigo-900/40"
                      >
                        <div className="space-y-2">
                          {/* ── Linked real products ── */}
                          {linkedProducts.map((cp: any) => {
                            const cpHasVariations =
                              (cp.variations ?? []).filter(
                                (v: any) => v.isActive !== false,
                              ).length > 0;
                            const cpMinPrice = cpHasVariations
                              ? Math.min(
                                  ...cp.variations
                                    .filter((v: any) => v.isActive !== false)
                                    .map((v: any) => v.price || 0),
                                )
                              : cp.finalPrice || 0;
                            return (
                              <div
                                key={cp.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                              >
                                {/* Cover image */}
                                <div className="shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-linear-to-br from-indigo-500 to-purple-600 border border-indigo-100 dark:border-indigo-800">
                                  {cp.image ? (
                                    <img
                                      src={cp.image}
                                      alt={cp.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-5 w-5 text-white/70" />
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold leading-tight line-clamp-1">
                                    {cp.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {cp.id}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      ·
                                    </span>
                                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                                      {cp.category}
                                    </span>
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
                                {/* Action button */}
                                {onAdd && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (cpHasVariations) {
                                        setNestedDetailProduct(cp);
                                      } else {
                                        onAdd({
                                          ...cp,
                                          finalPrice: cpMinPrice,
                                        });
                                      }
                                    }}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
                                  >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    {cpHasVariations
                                      ? "Ver opções"
                                      : "Adicionar"}
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {/* ── Fallback text-based complementary (only when no IDs linked) ── */}
                          {linkedProducts.length === 0 &&
                            textComps.map((cp: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40"
                              >
                                <Package className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold">
                                    {cp.title}
                                  </p>
                                  {cp.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                      {cp.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </Section>
                    );
                  })()}

                  {/* Pré-requisitos */}
                  {pres?.requirements?.length > 0 && (
                    <Section
                      icon={AlertCircle}
                      title="O que você precisa providenciar"
                      color="text-amber-600"
                      bg="bg-amber-100 dark:bg-amber-900/40"
                    >
                      <div className="space-y-1.5">
                        {pres.requirements.map((r: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Como contratar */}
                  {accountType === "empresas" ? (
                    <Section
                      icon={Zap}
                      title="Como contratar"
                      color="text-purple-600"
                      bg="bg-purple-100 dark:bg-purple-900/40"
                    >
                      {pres?.howToRequest?.length > 0 ? (
                        <div className="relative">
                          <div className="absolute left-4.75 top-6 bottom-4 w-px bg-border" />
                          {pres.howToRequest.map((s: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 relative pb-4 last:pb-0"
                            >
                              <span className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-purple-300 dark:border-purple-700 bg-background text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0 z-10">
                                {i + 1}
                              </span>
                              <div className="pt-2">
                                <p className="text-sm font-semibold">{s.step}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {s.description}
                                </p>
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
                            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                              Processo de contratação não disponível
                            </p>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mt-0.5">
                              Clique em "Escolher" para iniciar o processo de contratação deste serviço.
                            </p>
                          </div>
                        </div>
                      )}
                    </Section>
                  ) : pres?.howToRequest?.length > 0 ? (
                    <Section
                      icon={Zap}
                      title="Como contratar"
                      color="text-purple-600"
                      bg="bg-purple-100 dark:bg-purple-900/40"
                    >
                      <div className="relative">
                        <div className="absolute left-4.75 top-6 bottom-4 w-px bg-border" />
                        {pres.howToRequest.map((s: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 relative pb-4 last:pb-0"
                          >
                            <span className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-purple-300 dark:border-purple-700 bg-background text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0 z-10">
                              {i + 1}
                            </span>
                            <div className="pt-2">
                              <p className="text-sm font-semibold">{s.step}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {s.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {/* FAQ */}
                  {pres?.faq?.length > 0 && (
                    <Section
                      icon={MessageCircle}
                      title="Perguntas frequentes"
                      color="text-blue-600"
                      bg="bg-blue-100 dark:bg-blue-900/40"
                    >
                      <div className="space-y-2">
                        {pres.faq.map((f: any, i: number) => (
                          <FaqItem
                            key={i}
                            question={f.question}
                            answer={f.answer}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Briefing — Perguntas do formulário */}
                  {(product as any).questionnaire?.questions?.length > 0 && (
                    <Section
                      icon={FileText}
                      title="Briefing — Perguntas necessárias"
                      color="text-teal-600"
                      bg="bg-teal-100 dark:bg-teal-900/40"
                    >
                      <div className="space-y-2">
                        {(product as any).questionnaire.questions.map(
                          (q: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20"
                            >
                              <span className="flex-none h-6 w-6 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium leading-snug">
                                  {q.question}
                                </p>
                                {q.warning && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                    {q.warning}
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Prazos e processos */}
                  {(product as any).stages?.length > 0 && (
                    <Section
                      icon={CalendarClock}
                      title="Prazos e processos"
                      color="text-blue-600"
                      bg="bg-blue-100 dark:bg-blue-900/40"
                    >
                      <div className="space-y-2">
                        {(product as any).stages.map((s: any, i: number) => (
                          <div
                            key={i}
                            className="rounded-xl border border-border/60 p-3.5 bg-muted/20 flex items-start gap-3"
                          >
                            <span className="flex-none h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                              {s.number ?? i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{s.name}</p>
                              {s.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {s.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {s.executionDeadlineDays != null && (
                                  <span className="text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                    Execução: até {s.executionDeadlineDays} dia
                                    {s.executionDeadlineDays > 1
                                      ? "s"
                                      : ""}{" "}
                                    útil
                                    {s.executionDeadlineDays > 1 ? "is" : ""}
                                  </span>
                                )}
                                {s.approvalDeadlineDays != null && (
                                  <span className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                    Aprovação: até {s.approvalDeadlineDays} dias
                                    úteis
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
                    <Section
                      icon={AlertCircle}
                      title="Avisos importantes"
                      color="text-amber-600"
                      bg="bg-amber-100 dark:bg-amber-900/40"
                    >
                      <div className="space-y-2">
                        {pres.warnings.map((w: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-sm"
                          >
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
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── HANDLE de resize entre as colunas (apenas em sm+) ─── */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            className={cn(
              "hidden sm:flex order-1 sm:order-2 group relative w-1.5 cursor-col-resize select-none items-center justify-center bg-border/40 hover:bg-purple-300 transition-colors",
              isDragging && "bg-purple-500",
            )}
            title="Arraste para redimensionar"
          >
            <div
              className={cn(
                "h-10 w-1 rounded-full bg-border group-hover:bg-purple-500 transition-colors",
                isDragging && "bg-white",
              )}
            />
          </div>

          {/* ── COLUNA DIREITA: painel de ação ──────────────────── */}
          <div
            className="shrink-0 order-1 sm:order-3 border-b sm:border-b-0 sm:border-l border-border/50 flex flex-col bg-slate-50/60 dark:bg-slate-900/20"
            style={{
              flex: `0 0 ${rightFraction * 100}%`,
              width: `${rightFraction * 100}%`,
            }}
          >
            {/* Scrollable: preço + variações */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4 bg-linear-to-b from-slate-50 via-white to-slate-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                {/* ── Bloco de preço — segue tema do sidebar ── */}
                <div
                  className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_18px_50px_rgba(26,42,111,0.28)]"
                  style={{
                    background:
                      "var(--app-brand-gradient, linear-gradient(135deg, #050816 0%, #1a2a6f 45%, #c81a7f 100%))",
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-10 right-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-fuchsia-300/15 blur-2xl" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-2">
                    {hasVariations && !selectedVariation
                      ? "A partir de"
                      : product.recurrence === "Mensal"
                        ? "Valor mensal"
                        : "Valor do serviço"}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold leading-none">
                      {fmtBRL(displayedPrice)}
                    </span>
                    {product.recurrence === "Mensal" && (
                      <span className="text-blue-300 text-sm font-medium">
                        /mês
                      </span>
                    )}
                  </div>

                  {selectedVariation && (
                    <p className="text-sm text-emerald-300 font-semibold mt-1.5">
                      {selectedVariation.name}
                    </p>
                  )}

                  {/* Prazo */}
                  {(selectedVariation?.deadlineDays ||
                    product.deliveryDays) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15 text-xs text-blue-200">
                      <CalendarClock className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      Prazo:{" "}
                      <span className="font-semibold text-white">
                        {selectedVariation?.deadlineDays ??
                          product.deliveryDays}{" "}
                        dias
                      </span>
                    </div>
                  )}

                  {/* Recorrência */}
                  {product.recurrence && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-200">
                      <Repeat2 className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>{product.recurrence}</span>
                    </div>
                  )}
                </div>

                {/* ── Seleção de variação ──────────────────────── */}
                {hasVariations && (
                  <div className="space-y-2.5">
                    {/* Cabeçalho da seção */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedVariation
                              ? "text-emerald-600"
                              : "text-purple-600",
                          )}
                        />
                        <h3 className="text-sm font-bold">
                          {selectedVariation
                            ? "Opção selecionada"
                            : "Escolha uma opção"}
                        </h3>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {activeVariations.length}{" "}
                        {activeVariations.length === 1 ? "opção" : "opções"}
                      </span>
                    </div>

                    {/* Cards de variação */}
                    <div className="space-y-2">
                      {sortedVariations.map((v: any) => {
                        const isSel = selectedVariation?.id === v.id;
                        const campaignCount = parseCampaigns(v.name);
                        const platformCount = parsePlatforms(
                          v.scopeDescription,
                        );
                        const pageCount = parsePages(v.name);
                        const deadlineLabel = getDeadlineLabel(
                          v.name,
                          v.deadlineDays,
                          variationsInternal,
                        );
                        const features: string[] = v.features || [];

                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setSelectedVariation(isSel ? null : v)
                            }
                            className={cn(
                              "w-full text-left rounded-2xl border-2 p-4 transition-all bg-background",
                              isSel
                                ? "border-emerald-500 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-900"
                                : "border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:shadow-sm",
                            )}
                          >
                            {/* Linha 1: radio + nome + preço */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                {isSel ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                                )}
                                <p className="text-sm font-bold leading-tight">
                                  {v.name}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span
                                  className={cn(
                                    "text-base font-extrabold block leading-tight",
                                    isSel
                                      ? "text-emerald-600"
                                      : "text-foreground",
                                  )}
                                >
                                  {fmtBRL(v.price)}
                                </span>
                                {(product as any).recurrence === "Mensal" && (
                                  <span className="text-[10px] text-muted-foreground">
                                    /mês
                                  </span>
                                )}
                                {(product as any).recurrence ===
                                  "Avulso e Mensal" && (
                                  <span className="text-[10px] text-muted-foreground">
                                    avulso ou /mês
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Linha 2: pills de specs — sempre visíveis */}
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

                            {/* Linha 3: descrição curta da variação (escopo principal) */}
                            {v.description && (
                              <p className="mt-2 ml-6 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                {v.description}
                              </p>
                            )}

                            {/* Linha 4: bullet points — sempre visíveis */}
                            {features.length > 0 && (
                              <ul className="mt-2.5 ml-6 space-y-1">
                                {features.map((f: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Limite de contratos */}
                {product.itemLimit && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 text-sm">
                    <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>
                      Limite de{" "}
                      <strong>
                        {product.itemLimit} contrato
                        {product.itemLimit !== 1 ? "s" : ""}
                      </strong>{" "}
                      simultâneo{product.itemLimit !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── CTA fixo ──────────────────────────── */}
            <div className="shrink-0 border-t border-border/50 bg-background px-5 py-4 space-y-3">
              {hasVariations && !selectedVariation && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium leading-snug">
                    Selecione uma opção acima para continuar
                  </p>
                </div>
              )}

              {onAdd && (
                <Button
                  size="lg"
                  disabled={!canAdd}
                  className={cn(
                    "w-full gap-2.5 rounded-2xl font-bold text-sm border-0 shadow-lg transition-all",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                    isSelected
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : !canAdd
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        : "text-white",
                  )}
                  style={
                    !isSelected && canAdd
                      ? {
                          background:
                            "var(--app-brand-button, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
                        }
                      : undefined
                  }
                  onClick={() => {
                    if (!canAdd) return;
                    onAdd({
                      ...product,
                      selectedVariation: selectedVariation ?? undefined,
                      finalPrice: displayedPrice,
                      ...(selectedVariation
                        ? {
                            name: `${product.name} — ${selectedVariation.name}`,
                          }
                        : {}),
                    });
                    handleClose();
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isSelected
                    ? "Já na cesta"
                    : !canAdd
                      ? "Escolha uma opção"
                      : "Adicionar à cesta"}
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </SlidePanel>
      {/* ── Nested detail sheet for complementary products with variations ── */}
      {nestedDetailProduct && (
        <ProductDetailSheet
          product={nestedDetailProduct}
          open={!!nestedDetailProduct}
          onOpenChange={(v) => {
            if (!v) setNestedDetailProduct(null);
          }}
          onAdd={onAdd}
        />
      )}
    </>
  );
}
