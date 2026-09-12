"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Store,
  Loader2,
  Lock,
  Package,
  Search,
  ArrowUpDown,
  ChevronDown,
  Layers,
  ListChecks,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useIallkaContext } from "@/contexts/iallka-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { ProductViewModeToggle } from "@/components/product-view-mode-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";
import { ProvisionalBadge } from "@/components/provisional-badge";
import { usePersistedViewMode, viewModeGridClass } from "@/lib/use-persisted-view-mode";
import {
  provisionalPrice,
  provisionalDeadlineDays,
  provisionalTaskCount,
  provisionalStepCount,
  provisionalMerchandising,
  MERCH_KIND_LABEL,
  type MerchBadgeKind,
} from "@/lib/catalog2-provisional";
import { Info } from "lucide-react";
import { Catalog2PricingMemoryPopover } from "@/components/catalog2-pricing-memory-popover";
import { useIsAdminMaster } from "@/hooks/use-is-admin-master";

// Catálogo de Produtos — visão de APRESENTAÇÃO e conferência comercial dos
// produtos catalog2 (reunião 2026-09, consolidação "catálogo2 como cadastro
// definitivo"; e reparo seguinte, que recuperou a apresentação visual de
// catálogo — grade de cards, busca, categorias — perdida quando esta rota
// tinha sido trocada por uma tabela administrativa simplificada. Referência
// de layout: product-catalog-view.tsx, adaptado para dados catalog2 —
// nunca importado diretamente aqui, porque aquele componente é
// old-catalog/basket e compartilhado com telas de clientes que este reparo
// não deve arriscar).
//
// Só Admin Master (o backend reaplica em /api/admin/catalog2/* — mesma
// origem de dados do Cadastro de Produtos, /admin/produtos). Nunca mostra
// os 162 produtos antigos. Sem cesta/contratação (isso já existe em
// /company|agency/catalog2) e sem qualquer ação de escrita — o Cadastro de
// Produtos é quem edita; aqui é só leitura/conferência.
//
// Campos ausentes mostram mensagem honesta (nunca inventam preço/prazo/
// tarefa/imagem) — os textos de preço/prazo vêm do próprio backend
// (/readiness), que já não finge preço "R$ 0,00" quando não há tarefa.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  arquivado: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const PENDENCY_LABEL: Record<string, string> = {
  conteudo: "conteúdo", classificacao: "classificação", variacoes: "variações",
  adicionais: "adicionais", tarefas: "tarefas", etapas: "etapas", preco: "preço",
  prazo: "prazo", portfolio: "portfólio", revisao_rose: "revisão", publicacao: "publicação",
  esforco_tarefas: "especialidade/horas das tarefas",
};

interface ReadinessProduct {
  id: string;
  name: string;
  is_test_local: boolean;
  status: string;
  published: boolean;
  task_count: number;
  step_count: number;
  // Valores reais, nunca inventados — nulos quando o preço/prazo comercial
  // ainda não está pronto (mesma regra do card/detalhe honestos).
  price_amount: number | null;
  deadline_days: number | null;
  pricing_simulation?: {
    is_provisional: true;
    price_amount: number;
    deadline_days: number | null;
    commercial_ready: false;
    authorizes_publish: false;
    authorizes_quote: false;
    authorizes_contract: false;
  } | null;
  items: Record<string, { level: string; note: string }>;
  blockers: string[];
  pendings: string[];
  // Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
  // especialidade/tempo provisórios (dado de teste) — nunca decisão
  // comercial. Ver items.esforco_tarefas pra o detalhe por tarefa.
  effort_data_state?: "missing" | "provisional" | "real_reviewed";
  functional_for_test?: boolean;
  functional_for_test_label?: string | null;
  // Camada de demonstração provisória (reparo 2026-09) — sempre um bloco
  // SEPARADO, nunca confundido com os campos reais acima.
  provisional: {
    is_provisional: true;
    needs_review: boolean;
    image_path: string | null;
    price_amount: number | null;
    deadline_days: number | null;
    modality: string | null;
  } | null;
  // Merchandising administrável (reunião 10/09) — sempre real, nulo até um
  // Admin Master decidir; nunca preenchido automaticamente.
  merchandising: {
    is_new: boolean | null;
    is_launch: boolean | null;
    is_promotion: boolean | null;
    is_featured: boolean | null;
    promotion_text: string | null;
    promotion_valid_until: string | null;
    badge_priority: number | null;
  } | null;
}
interface ListProduct {
  id: string;
  slug: string;
  category: { id: string; name: string } | null;
  summary: string | null;
  published_version_number: number | null;
  is_new?: boolean;
  updated_at?: string;
}
type Merged = ReadinessProduct & { list?: ListProduct };

// Mesmas 7 opções do Catálogo publicado (product-catalog-view.tsx,
// SORT_OPTIONS) — 4 reais (preço/nome), "Alterado recentemente" some no
// lugar de "Mais relevantes" (nenhuma métrica de relevância real existe
// pro catalog2 ainda). "Mais vendidos"/"Melhor avaliados" ficam visíveis e
// desabilitados (ver DISABLED_SORTS) — nunca removidos silenciosamente,
// nunca com dado inventado.
// Ordenação por preço usa o valor REAL quando existe, e o PROVISÓRIO
// (determinístico, nunca inventado na hora) só pra ordenar administrativamente
// os produtos que ainda não têm preço pronto — nunca exibido como se fosse
// comercial (o card/linha sempre mostra o selo "provisório" ao lado).
function priceForSort(p: Merged): number {
  return p.price_amount ?? p.pricing_simulation?.price_amount ?? p.provisional?.price_amount ?? provisionalPrice(p.id).value;
}

// ── Badge comercial (reunião 10/09) — UM único badge por card, prioridade
// real: promoção > lançamento > novo > destaque (a mesma ordem de urgência
// comercial). Real sempre vence; provisório só aparece quando NENHUM campo
// real de merchandising está definido, e a fixture nunca recebe badge.
interface MerchBadgeView { kind: MerchBadgeKind; label: string; isProvisional: boolean; promotionText?: string | null }
function resolveMerchBadge(p: Merged): MerchBadgeView | null {
  const m = p.merchandising;
  if (m) {
    if (m.is_promotion) return { kind: "promocao", label: "Promoção", isProvisional: false, promotionText: m.promotion_text };
    if (m.is_launch) return { kind: "lancamento", label: "Lançamento", isProvisional: false };
    if (m.is_new) return { kind: "novo", label: "Novo", isProvisional: false };
    if (m.is_featured) return { kind: "destaque", label: "Destaque", isProvisional: false };
  }
  // "Novo" derivado (publicação recente) — mesmo conceito exibido antes num
  // badge separado no canto da imagem; unificado aqui pra nunca duplicar
  // "Novo" em dois lugares do card.
  if (p.list?.is_new) return { kind: "novo", label: "Novo", isProvisional: false };
  if (p.is_test_local) return null; // fixture nunca recebe badge comercial
  const prov = provisionalMerchandising(p.id);
  if (!prov.value) return null;
  return { kind: prov.value, label: MERCH_KIND_LABEL[prov.value], isProvisional: true };
}

const MERCH_TONE: Record<MerchBadgeKind, string> = {
  novo: "bg-blue-500 text-white",
  lancamento: "bg-violet-600 text-white",
  promocao: "bg-rose-600 text-white",
  destaque: "bg-amber-500 text-white",
};
function MerchBadgeChip({ badge }: { badge: MerchBadgeView }) {
  const text = badge.isProvisional ? `${badge.label} (provisório)` : badge.label;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${MERCH_TONE[badge.kind]} ${badge.isProvisional ? "opacity-90 ring-1 ring-white/60" : ""}`}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-xs">
          {badge.isProvisional
            ? "Badge provisório de demonstração — nenhum campo de merchandising foi definido ainda para este produto; revisar antes de publicar."
            : badge.promotionText || `Badge comercial real: ${badge.label}.`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Código interno (reunião 10/09) — nunca ocupa espaço fixo no card; só
// um ícone pequeno que, ao passar o mouse OU focar (teclado), mostra
// slug/versão/id — nunca "ANTIGA #..." (isso não existe no catalog2).
function ProductCodeInfo({ p }: { p: Merged }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Código e identificadores de ${p.name}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-slate-800"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <p>Código: <span className="font-mono">{p.list?.slug ?? "—"}</span></p>
          {p.list?.published_version_number != null && <p>Versão publicada: v{p.list.published_version_number}</p>}
          <p>ID (suporte): <span className="font-mono">{p.id}</span></p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const SORTS = {
  name: { label: "Nome A–Z", fn: (a: Merged, b: Merged) => a.name.localeCompare(b.name) },
  name_desc: { label: "Nome Z–A", fn: (a: Merged, b: Merged) => b.name.localeCompare(a.name) },
  price_asc: { label: "Menor preço", fn: (a: Merged, b: Merged) => priceForSort(a) - priceForSort(b) },
  price_desc: { label: "Maior preço", fn: (a: Merged, b: Merged) => priceForSort(b) - priceForSort(a) },
  updated: {
    label: "Alterado recentemente",
    fn: (a: Merged, b: Merged) => new Date(b.list?.updated_at ?? 0).getTime() - new Date(a.list?.updated_at ?? 0).getTime(),
  },
} as const;

// Do Catálogo publicado, sem dado real no catalog2 ainda: nenhum produto
// tem venda ou avaliação registrada (nenhum campo no schema). Mostradas
// desabilitadas com explicação — nunca removidas, nunca inventadas.
// "Mais relevantes" some de vez porque a versão antiga era um cálculo
// composto de venda+avaliação+recência (nenhuma base real hoje); as outras
// duas mantêm o rótulo original do layout publicado para ficar claro que a
// opção existia e está apenas aguardando dado real.
const DISABLED_SORTS = [
  { label: "Mais vendidos", reason: "Sem dado real de contratações para os produtos novos ainda — existe um vínculo real (ProjectProduct) pra isso quando os primeiros forem publicados e contratados." },
  { label: "Melhor avaliados", reason: "Catalog2 ainda não tem avaliação de produto — nenhum campo no modelo." },
] as const;

// ── Painel de filtros (reunião 10/09) — só filtros catalog2 REAIS, cada um
// com equivalente de dado no backend (nunca um filtro herdado do catálogo
// antigo sem correspondência aqui). Estado aplicado (`filters`) é separado
// do rascunho do painel (`draftFilters`): "Aplicar" grava o rascunho,
// "Fechar" descarta (o rascunho é reiniciado do estado aplicado sempre que
// o painel abre), "Limpar" zera os dois de uma vez.
interface CatalogFilters {
  status: string;
  hasPrice: boolean;
  hasDeadline: boolean;
  hasTasks: boolean;
  hasSteps: boolean;
  hasPendencies: boolean;
  provisionalOnly: boolean;
}
const DEFAULT_FILTERS: CatalogFilters = {
  status: "", hasPrice: false, hasDeadline: false, hasTasks: false,
  hasSteps: false, hasPendencies: false, provisionalOnly: false,
};
function countActiveFilters(f: CatalogFilters): number {
  return (f.status ? 1 : 0) + [f.hasPrice, f.hasDeadline, f.hasTasks, f.hasSteps, f.hasPendencies, f.provisionalOnly].filter(Boolean).length;
}
function hasRealPrice(p: Merged) { return !!p.items.preco?.note; }
function hasRealDeadline(p: Merged) { return !!p.items.prazo?.note; }
function hasAnyPendency(p: Merged) { return p.blockers.length + p.pendings.length > 0; }
// "Campos provisórios" = pelo menos um dos campos comerciais visíveis
// (preço/prazo/tarefas/etapas) ainda não é real — mesma regra usada nos
// selos "provisório" dos cards/detalhe.
function hasAnyProvisionalField(p: Merged) {
  return !hasRealPrice(p) || !hasRealDeadline(p) || p.task_count === 0 || p.step_count === 0;
}
function matchesFilters(p: Merged, f: CatalogFilters): boolean {
  if (f.status && p.status !== f.status) return false;
  if (f.hasPrice && !hasRealPrice(p)) return false;
  if (f.hasDeadline && !hasRealDeadline(p)) return false;
  if (f.hasTasks && p.task_count === 0) return false;
  if (f.hasSteps && p.step_count === 0) return false;
  if (f.hasPendencies && !hasAnyPendency(p)) return false;
  if (f.provisionalOnly && !hasAnyProvisionalField(p)) return false;
  return true;
}

export default function AdminCatalogoProdutosPage() {
  const isAdminMaster = useIsAdminMaster();
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [readinessProducts, setReadinessProducts] = useState<ReadinessProduct[]>([]);
  const [listById, setListById] = useState<Record<string, ListProduct>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [sort, setSort] = useState<keyof typeof SORTS>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  // Detalhe comercial COMPLETO (layout publicado, reparo 2026-09) — bridge a
  // partir do resumo administrativo (ProductDetail), ação separada.
  const [fullDetailId, setFullDetailId] = useState<string | null>(null);
  // Grade/Lista — preferência isolada desta tela (distinta do Cadastro),
  // persistida em localStorage. Padrão em Lista (reunião 10/09, "cards e
  // interação do catálogo") para quem ainda não escolheu nada; quem já
  // tem uma preferência salva (Grade/2-5 colunas) continua vendo a dela —
  // a hidratação do hook só troca o valor quando existe algo salvo.
  const [gridMode, setGridMode] = usePersistedViewMode("admin-catalogo-produtos", "list");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [readiness, list, cats] = await Promise.all([
        apiClient.getCatalog2Readiness(),
        apiClient.getCatalog2Products({ page_size: 100 }),
        apiClient.getCatalog2Categories(),
      ]);
      setReadinessProducts(readiness.products ?? []);
      const byId: Record<string, ListProduct> = {};
      for (const p of list.data ?? []) byId[p.id] = p;
      setListById(byId);
      setCategories(cats.data ?? []);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const merged: Merged[] = useMemo(
    () => readinessProducts.map((p) => ({ ...p, list: listById[p.id] })),
    [readinessProducts, listById],
  );
  const real = useMemo(() => merged.filter((p) => !p.is_test_local), [merged]);
  const fixture = useMemo(() => merged.find((p) => p.is_test_local) ?? null, [merged]);

  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of real) {
      const name = p.list?.category?.name ?? "Sem categoria";
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return [
      { id: "Todos", label: "Todos", count: real.length },
      ...Object.entries(counts).map(([name, count]) => ({ id: name, label: name, count })),
    ];
  }, [real]);

  const filtered = useMemo(() => {
    let rows = real;
    if (category !== "Todos") rows = rows.filter((p) => (p.list?.category?.name ?? "Sem categoria") === category);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    rows = rows.filter((p) => matchesFilters(p, filters));
    return [...rows].sort(SORTS[sort].fn);
  }, [real, category, search, sort, filters]);

  const activeFilterCount = countActiveFilters(filters);
  const openFiltersPanel = () => { setDraftFilters(filters); setFiltersOpen(true); };
  const applyFilters = () => { setFilters(draftFilters); setFiltersOpen(false); };
  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setDraftFilters(DEFAULT_FILTERS); };
  const removeActiveFilter = (key: keyof CatalogFilters) => {
    const next = { ...filters, [key]: key === "status" ? "" : false };
    setFilters(next);
    setDraftFilters(next);
  };
  const FILTER_CHIP_LABEL: Record<string, string> = {
    status: filters.status ? `Status: ${STATUS_LABEL[filters.status] ?? filters.status}` : "",
    hasPrice: "Com preço",
    hasDeadline: "Com prazo",
    hasTasks: "Com tarefas",
    hasSteps: "Com etapas",
    hasPendencies: "Com pendências",
    provisionalOnly: "Campos provisórios",
  };

  const openedProduct = merged.find((p) => p.id === openProductId) ?? null;

  // Contexto seguro pra IAllka (reunião 10/09) — só o que esta tela já
  // mostra na própria UI (categoria, busca, quantos itens estão visíveis,
  // nome do produto aberto); nunca um ID técnico nem dado de outra conta.
  useEffect(() => {
    setIallkaScreenContext({
      label: "Catálogo de Produtos",
      category: category !== "Todos" ? category : undefined,
      search: search || undefined,
      visibleCount: filtered.length,
      openItemName: openedProduct?.name,
    });
    return () => setIallkaScreenContext(null);
  }, [category, search, filtered.length, openedProduct?.name, setIallkaScreenContext]);

  if (state === "loading") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
      </div>
    );
  }
  if (state === "forbidden") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered><Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master neste momento.</Centered>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered>Não foi possível carregar.</Centered>
      </div>
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative flex h-full min-h-[70vh] flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Store}
            title="Catálogo de Produtos"
            description="Visão comercial dos produtos novos (catalog2) — como serão apresentados, e o que falta para cada um."
            actions={
              <>
                <a
                  href="/admin/catalog2?preview=1"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-white/70 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Visualizar como cliente
                </a>
                <PinToTrayButton id="page-catalogo-produtos" label="Catálogo de Produtos" icon={Store} path="/admin/catalogo-produtos" />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              O catálogo antigo, com 162 produtos, não aparece mais aqui — ele segue no banco só para não quebrar
              projetos antigos já ligados a ele. Para editar um produto, use o Cadastro de Produtos.
            </p>

            {/* ── Cabeçalho reorganizado (reunião 10/09): busca em destaque +
                filtros + ordenação + alternador NUMA ÚNICA linha; categorias
                em badges logo abaixo. Nenhum desses controles se repete em
                outro lugar da tela. ── */}
            <div className="space-y-3 rounded-xl border border-slate-100 bg-white/80 p-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar produtos…"
                    aria-label="Buscar produtos"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Popover open={filtersOpen} onOpenChange={(open) => (open ? openFiltersPanel() : setFiltersOpen(false))}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 shrink-0 gap-1.5 text-xs ${activeFilterCount > 0 ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filtros
                      {activeFilterCount > 0 && (
                        <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">{activeFilterCount}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {countActiveFilters(draftFilters)} ativo{countActiveFilters(draftFilters) === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div>
                      <label htmlFor="cat-f-status" className="mb-1 block text-[11px] font-medium text-muted-foreground">Status</label>
                      <select
                        id="cat-f-status"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                        value={draftFilters.status}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="">Todos os status</option>
                        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {([
                        ["hasPrice", "Com preço"],
                        ["hasDeadline", "Com prazo"],
                        ["hasTasks", "Com tarefas"],
                        ["hasSteps", "Com etapas"],
                        ["hasPendencies", "Com pendências"],
                        ["provisionalOnly", "Campos provisórios"],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-xs text-foreground">
                          <Checkbox
                            checked={draftFilters[key]}
                            onCheckedChange={(v) => setDraftFilters((f) => ({ ...f, [key]: v === true }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>Limpar</Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                        <Button size="sm" className="text-xs" onClick={applyFilters}>Aplicar</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {SORTS[sort].label}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(SORTS).map(([k, v]) => (
                      <DropdownMenuItem key={k} onClick={() => setSort(k as keyof typeof SORTS)}>{v.label}</DropdownMenuItem>
                    ))}
                    {DISABLED_SORTS.map((d) => (
                      <DropdownMenuItem key={d.label} disabled title={d.reason} className="opacity-50">
                        {d.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                  {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
                </span>
                <ProductViewModeToggle value={gridMode} onChange={setGridMode} />
              </div>

              {/* Badges dos filtros ativos — só aparecem quando há algum. */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(Object.keys(filters) as (keyof CatalogFilters)[])
                    .filter((k) => (k === "status" ? !!filters[k] : filters[k] === true))
                    .map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => removeActiveFilter(k)}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {FILTER_CHIP_LABEL[k]}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  <button type="button" onClick={clearFilters} className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline">
                    Limpar filtros
                  </button>
                </div>
              )}

              {/* Category pills — categorias REAIS do catalog2. */}
              <div className="flex flex-wrap gap-2">
                {categoryTabs.map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      category === id
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                    style={category === id ? { background: "linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%)" } : undefined}
                  >
                    <Layers className="h-3 w-3" />
                    {label}
                    <span className={`rounded-full px-1 py-0.5 text-[10px] leading-none ${category === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grade de cards ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                <Package className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum produto encontrado</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {search || category !== "Todos" ? "Tente ajustar a busca ou a categoria." : "Nenhum produto catalog2 cadastrado ainda."}
                </p>
              </div>
            ) : gridMode === "list" ? (
              <ul className="divide-y overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-slate-700/60 dark:bg-slate-900">
                {filtered.map((p) => <ProductListRow key={p.id} product={p} onOpen={() => setOpenProductId(p.id)} isAdminMaster={isAdminMaster} />)}
              </ul>
            ) : (
              <div className={viewModeGridClass(gridMode)}>
                {filtered.map((p) => <ProductCard key={p.id} product={p} compact={gridMode === 4 || gridMode === 5} onOpen={() => setOpenProductId(p.id)} isAdminMaster={isAdminMaster} />)}
              </div>
            )}

            {fixture && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                1 produto de demonstração ("[TESTE LOCAL] …") existe para testes e fica fora desta grade — nunca é um
                produto real, e nunca aparece no catálogo do cliente.
              </p>
            )}
          </div>
        </div>

        {/* Detalhe do produto — dentro do container padrão, só leitura. */}
        <EmbeddedSlideScreen
          open={!!openedProduct}
          onClose={() => { setOpenProductId(null); setFullDetailId(null); }}
          title={fullDetailId ? "Detalhe comercial completo" : (openedProduct?.name ?? "Produto")}
          pin={openedProduct ? {
            id: `catalog2-catalogo-${openedProduct.id}`,
            label: openedProduct.name,
            icon: Store,
            path: "/admin/catalogo-produtos",
          } : undefined}
        >
          {openedProduct && (
            fullDetailId ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <Catalog2ProductDetail productId={fullDetailId} onBack={() => setFullDetailId(null)} isAdminMaster={isAdminMaster} />
              </div>
            ) : (
              <ProductDetail product={openedProduct} onViewFull={() => setFullDetailId(openedProduct.id)} isAdminMaster={isAdminMaster} />
            )
          )}
        </EmbeddedSlideScreen>
      </div>
    </div>
  );
}

// Card inteiro clicável (reunião 10/09) — clique em qualquer área livre
// abre o detalhe completo; elementos internos (botão "Ver detalhes", ícone
// de informação) chamam `e.stopPropagation()` pra nunca disparar a MESMA
// ação duas vezes. Enter/Espaço abrem quando o card está focado; foco
// visível e cursor de ponteiro deixam claro que é clicável.
function ProductCard({ product: p, onOpen, compact = false, isAdminMaster = false }: { product: Merged; onOpen: () => void; compact?: boolean; isAdminMaster?: boolean }) {
  const categoryName = p.list?.category?.name ?? "Sem categoria";
  // Fonte ÚNICA de provisório: Catalog2ProvisionalPreview (via p.provisional,
  // vindo do backend). O hash local só é usado se o produto não tiver
  // nenhuma linha provisória gravada (reparo 2026-09, seção 11).
  const priceProv = p.provisional?.price_amount != null ? { value: p.provisional.price_amount, label: "Preço provisório — revisar.", is_provisional: true as const } : provisionalPrice(p.id);
  const prazoProv = p.provisional?.deadline_days != null ? { value: p.provisional.deadline_days, label: "Prazo provisório — revisar.", is_provisional: true as const } : provisionalDeadlineDays(p.id);
  const taskProv = provisionalTaskCount(p.id);
  const hasRealTasks = p.task_count > 0;
  const pendCount = p.blockers.length + p.pendings.length;
  const badge = resolveMerchBadge(p);
  const cardLabel = `${p.name} — ver detalhes`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
    >
      {/* Banner — imagem real reaproveitada provisoriamente (backend,
          Catalog2ProvisionalPreview) quando existe; ícone/gradiente
          determinístico só como fallback — ver catalog2-thumbnail.tsx.
          Badge comercial no canto ESQUERDO (loja virtual); status no
          canto DIREITO — nunca os dois no mesmo canto, nunca repetidos. */}
      <div className={`relative shrink-0 ${compact ? "h-20" : "h-32"}`}>
        <Catalog2Thumbnail productId={p.id} imagePath={p.provisional?.image_path} size="lg" showBadge />
        {badge && (
          <div className="absolute left-2.5 top-2.5">
            <MerchBadgeChip badge={badge} />
          </div>
        )}
        <div className="absolute right-2.5 top-2.5">
          <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
        </div>
      </div>

      <CardContent className={`flex flex-1 flex-col gap-2.5 ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-start justify-between gap-1.5">
          <h3 title={p.name} className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100">
            {p.name}
          </h3>
          <ProductCodeInfo p={p} />
        </div>
        {!compact && (
          <p title={p.list?.summary ?? undefined} className="line-clamp-2 text-xs leading-relaxed text-slate-400">
            {p.list?.summary || "Descrição ainda não escrita — produto em preparação."}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span title={categoryName} className="truncate font-medium">{categoryName}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ListChecks className="h-3.5 w-3.5 shrink-0" />
          {hasRealTasks ? (
            <span className="truncate">
              {p.task_count} tarefa(s){p.step_count > 0 ? ` · ${p.step_count} etapa(s)` : ""}
            </span>
          ) : (
            <>
              <span className="truncate text-slate-400">{taskProv.value} tarefa(s)</span>
              <ProvisionalBadge label={taskProv.label + " Pendência real de tarefas continua registrada."} />
            </>
          )}
          {p.functional_for_test && (
            <ProvisionalBadge label="Especialidade e tempo provisórios para teste — funcional para teste, pendente de revisão. Nunca usado para aprovar preço comercial ou publicação." />
          )}
        </div>

        {pendCount > 0 && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} onClick={(e) => e.stopPropagation()} className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {pendCount} pendência{pendCount === 1 ? "" : "s"}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">
                {[...p.blockers, ...p.pendings].map((k) => PENDENCY_LABEL[k] ?? k).join(", ")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="mt-auto space-y-1 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <PriceOrProvisional p={p} priceProv={priceProv} isAdminMaster={isAdminMaster} />
          <DeadlineOrProvisional p={p} prazoProv={prazoProv} />
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full border-blue-200 bg-transparent text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            Ver detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceOrProvisional({ p, priceProv, isAdminMaster = false }: { p: Merged; priceProv: ReturnType<typeof provisionalPrice>; isAdminMaster?: boolean }) {
  if (p.pricing_simulation?.price_amount != null && p.price_amount == null) {
    return (
      <p className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
        R$ {p.pricing_simulation.price_amount.toFixed(2)}
        <ProvisionalBadge label="Preço final simulado para teste. Não vale para cotação, checkout, publicação ou contratação." />
        <Catalog2PricingMemoryPopover productId={p.id} isAdminMaster={isAdminMaster} />
      </p>
    );
  }
  if (p.items.preco?.note) {
    return (
      <p className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {p.items.preco.note}
        <Catalog2PricingMemoryPopover productId={p.id} isAdminMaster={isAdminMaster} />
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
      R$ {priceProv.value.toFixed(2)}
      <ProvisionalBadge label={priceProv.label + " Não vale para cotação, checkout ou publicação."} />
      <Catalog2PricingMemoryPopover productId={p.id} isAdminMaster={isAdminMaster} provisionalPriceAmount={priceProv.value} />
    </p>
  );
}
function DeadlineOrProvisional({ p, prazoProv }: { p: Merged; prazoProv: ReturnType<typeof provisionalDeadlineDays> }) {
  if (p.pricing_simulation?.deadline_days != null && p.deadline_days == null) {
    return (
      <p className="flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-300">
        {p.pricing_simulation.deadline_days} dia(s)
        <ProvisionalBadge label="Prazo simulado para teste — nunca é promessa ao cliente." />
      </p>
    );
  }
  if (p.items.prazo?.note) {
    return <p className="text-[11px] text-slate-400">{p.items.prazo.note}</p>;
  }
  return (
    <p className="flex items-center gap-1 text-[11px] text-slate-400">
      {prazoProv.value} dia(s)
      <ProvisionalBadge label={prazoProv.label} />
    </p>
  );
}

// Modo Lista — mesma apresentação comercial, densidade maior (linha em vez
// de card). Restaurado 2026-09 junto do alternador Lista/Grade; reunião
// 10/09: a linha inteira também abre o detalhe (mesmo padrão do card).
function ProductListRow({ product: p, onOpen, isAdminMaster = false }: { product: Merged; onOpen: () => void; isAdminMaster?: boolean }) {
  const priceProv = p.provisional?.price_amount != null ? { value: p.provisional.price_amount, label: "Preço provisório — revisar.", is_provisional: true as const } : provisionalPrice(p.id);
  const taskProv = provisionalTaskCount(p.id);
  const categoryName = p.list?.category?.name ?? "Sem categoria";
  const badge = resolveMerchBadge(p);
  const cardLabel = `${p.name} — ver detalhes`;
  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 active:bg-slate-100 dark:hover:bg-slate-800/40 dark:active:bg-slate-800"
    >
      <div className="relative shrink-0">
        <Catalog2Thumbnail productId={p.id} imagePath={p.provisional?.image_path} size="sm" showBadge={false} />
        {badge && (
          <div className="absolute -left-1 -top-1">
            <MerchBadgeChip badge={badge} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span title={p.name} className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
          <ProductCodeInfo p={p} />
        </div>
        <p title={categoryName} className="truncate text-xs text-slate-400">
          {categoryName} · {p.task_count > 0 ? `${p.task_count} tarefa(s)` : `${taskProv.value} tarefa(s) (provisório)`}
          {p.functional_for_test ? " · especialidade/tempo provisórios (teste)" : ""}
        </p>
      </div>
      <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
      <span className="hidden w-40 shrink-0 items-center justify-end gap-1 truncate text-right text-xs text-slate-500 sm:inline-flex">
        {p.price_amount != null
          ? `R$ ${p.price_amount.toFixed(2)}`
          : p.pricing_simulation?.price_amount != null
            ? `R$ ${p.pricing_simulation.price_amount.toFixed(2)} (simulação)`
            : p.items.preco?.note ?? `R$ ${priceProv.value.toFixed(2)} (provisório)`}
        <Catalog2PricingMemoryPopover
          productId={p.id}
          isAdminMaster={isAdminMaster}
          provisionalPriceAmount={!p.items.preco?.note && !p.pricing_simulation ? priceProv.value : undefined}
        />
      </span>
      <Button variant="outline" size="sm" className="shrink-0 border-blue-200 text-xs text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        Ver detalhes
      </Button>
    </li>
  );
}

// Detalhe comercial — só leitura; nenhum controle de edição aparece aqui de
// propósito (edição é função do Cadastro de Produtos).
function ProductDetail({ product: p, onViewFull, isAdminMaster = false }: { product: Merged; onViewFull?: () => void; isAdminMaster?: boolean }) {
  const categoryName = p.list?.category?.name ?? "Sem categoria";
  const pendencias = [...p.blockers, ...p.pendings];
  const priceProv = p.provisional?.price_amount != null ? { value: p.provisional.price_amount, label: "Preço provisório — revisar.", is_provisional: true as const } : provisionalPrice(p.id);
  const prazoProv = p.provisional?.deadline_days != null ? { value: p.provisional.deadline_days, label: "Prazo provisório — revisar.", is_provisional: true as const } : provisionalDeadlineDays(p.id);
  const taskProv = provisionalTaskCount(p.id);
  const stepProv = provisionalStepCount(p.id, taskProv.value);
  const hasRealPrice = p.price_amount != null;
  const hasRealPrazo = p.deadline_days != null;
  const hasRealTasks = p.task_count > 0;
  const hasRealSteps = p.step_count > 0;
  const hasRealSummary = !!p.list?.summary;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
            <Badge variant="outline">{categoryName}</Badge>
            {p.list?.published_version_number && <Badge variant="outline">v{p.list.published_version_number} publicada</Badge>}
          </div>
          {onViewFull && (
            <Button size="sm" variant="outline" onClick={onViewFull} className="text-xs">
              Ver detalhe comercial completo
            </Button>
          )}
        </div>

        <div className="h-40">
          <Catalog2Thumbnail productId={p.id} imagePath={p.provisional?.image_path} size="lg" showBadge />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">Descrição</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <span>{p.list?.summary || "Descrição ainda não escrita — produto em preparação."}</span>
            {!hasRealSummary && <ProvisionalBadge label="Sem resumo real ainda — cadastre pelo Cadastro de Produtos." />}
          </p>
        </div>

        {/* Resumo real × provisório × ausente — pra Admin Master entender
            exatamente o que precisa ser substituído (reparo 2026-09). */}
        <div>
          <h2 className="text-sm font-semibold text-foreground">Campos reais × provisórios</h2>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <FieldStatusChip label="Descrição" status={hasRealSummary ? "real" : "provisorio"} />
            <FieldStatusChip label="Preço" status={hasRealPrice ? "real" : "provisorio"} />
            <FieldStatusChip label="Prazo" status={hasRealPrazo ? "real" : "provisorio"} />
            <FieldStatusChip label="Tarefas" status={hasRealTasks ? "real" : "provisorio"} />
            <FieldStatusChip label="Etapas" status={hasRealSteps ? "real" : "provisorio"} />
            <FieldStatusChip label="Imagem" status="provisorio" />
            <FieldStatusChip
              label="Especialidade/Tempo"
              status={p.effort_data_state === "real_reviewed" ? "real" : p.effort_data_state === "provisional" ? "provisorio" : "ausente"}
            />
          </div>
          {p.functional_for_test && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <ProvisionalBadge label="Especialidade e tempo provisórios para teste — revisar antes de aprovar comercialmente." />
              {p.functional_for_test_label}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailStat
            label="Preço"
            value={hasRealPrice
              ? `R$ ${p.price_amount!.toFixed(2)}`
              : p.pricing_simulation?.price_amount != null
                ? `R$ ${p.pricing_simulation.price_amount.toFixed(2)}`
                : `R$ ${priceProv.value.toFixed(2)}`}
            provisional={!hasRealPrice ? (p.pricing_simulation ? "Simulação provisória para teste" : priceProv.label) : undefined}
            extra={<Catalog2PricingMemoryPopover productId={p.id} isAdminMaster={isAdminMaster} provisionalPriceAmount={!hasRealPrice && !p.pricing_simulation ? priceProv.value : undefined} />}
          />
          <DetailStat
            label="Prazo"
            value={hasRealPrazo
              ? `${p.deadline_days} dia(s)`
              : p.pricing_simulation?.deadline_days != null
                ? `${p.pricing_simulation.deadline_days} dia(s)`
                : `${prazoProv.value} dia(s)`}
            provisional={!hasRealPrazo ? (p.pricing_simulation ? "Simulação provisória para teste" : prazoProv.label) : undefined}
          />
          <DetailStat label="Tarefas" value={hasRealTasks ? String(p.task_count) : String(taskProv.value)} provisional={!hasRealTasks ? taskProv.label : undefined} />
          <DetailStat label="Etapas" value={hasRealSteps ? String(p.step_count) : String(stepProv.value)} provisional={!hasRealSteps ? stepProv.label : undefined} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Variações e adicionais</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {p.items.variacoes?.note ?? "Sem informação de variações."}
            </span>
            <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {p.items.adicionais?.note ?? "Sem informação de adicionais."}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">O que falta para publicar</h2>
          {pendencias.length === 0 ? (
            <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-300">Nenhuma pendência — pronto para revisão final.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.blockers.map((b) => (
                <Badge key={b} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{PENDENCY_LABEL[b] ?? b}</Badge>
              ))}
              {p.pendings.map((b) => (
                <Badge key={b} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{PENDENCY_LABEL[b] ?? b}</Badge>
              ))}
            </div>
          )}
        </div>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Esta é uma visualização comercial, só leitura. Para editar tarefas, etapas, preço ou publicar, use o
          Cadastro de Produtos. Valores provisórios nunca entram em cotação, checkout ou publicação — servem só
          pra conferência visual.
        </p>
      </div>
    </div>
  );
}
function DetailStat({ label, value, provisional, extra }: { label: string; value: string; provisional?: string; extra?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center gap-1">
        <p className={`text-xs ${provisional ? "text-slate-400" : "text-foreground"}`}>{value}</p>
        {provisional && <ProvisionalBadge label={provisional} />}
        {extra}
      </div>
    </div>
  );
}
function FieldStatusChip({ label, status }: { label: string; status: "real" | "provisorio" | "ausente" }) {
  const tone =
    status === "real" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : status === "provisorio" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-muted text-muted-foreground";
  const statusLabel = status === "real" ? "Real" : status === "provisorio" ? "Provisório" : "Ausente";
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${tone}`}>
      <span>{label}</span>
      <span className="font-semibold">{statusLabel}</span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{children}</div>;
}
