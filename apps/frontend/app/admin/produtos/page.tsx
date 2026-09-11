"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock as ClockIcon,
  Eye,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { ProductViewModeToggle } from "@/components/product-view-mode-toggle";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { ProvisionalBadge } from "@/components/provisional-badge";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { usePersistedViewMode, viewModeGridClass } from "@/lib/use-persisted-view-mode";
import { provisionalPrice, provisionalTaskCount } from "@/lib/catalog2-provisional";
import { ProductEditor } from "@/app/admin/produtos/novo-catalogo/product-editor";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";

// Cadastro de Produtos — administração exclusiva dos produtos catalog2
// (reunião 2026-09, consolidação "catálogo2 como cadastro definitivo"; e
// reparo 2026-09 seguinte, que recuperou o layout administrativo aprovado
// — abas de filtro rápido, banner padrão e tabela — perdido quando esta
// rota foi trocada pela tela então chamada "Preparação de Produtos").
// Só Admin Master (o backend reaplica em /api/admin/catalog2/*). Não mostra
// os 162 produtos antigos — esses continuam no banco (projetos antigos que
// os referenciam não quebram), só saíram das telas de cadastro/catálogo/
// contratação. O construtor (ProductEditor) abre aqui mesmo, dentro do
// container padrão (EmbeddedSlideScreen), nunca como área separada.
//
// Anteriormente esta era a rota /admin/produtos/novo-catalogo ("Preparação
// de Produtos"); aquela rota agora só redireciona pra cá (ver
// novo-catalogo/page.tsx), preservando o produto selecionado via ?produto=.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
// Pequenos acentos de status — chips sólidos legíveis nos dois temas.
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-muted text-muted-foreground",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  arquivado: "bg-muted text-muted-foreground",
};

// Estados de preparo e pendências da importação dos 36 (bloco 4/6).
const REVIEW_STATE_LABEL: Record<string, string> = {
  importado: "Importado",
  content_review_pending: "Revisar conteúdo",
  classification_decision_pending: "Decidir classificação",
  price_pending: "Definir preço",
  deadline_pending: "Definir prazo comercial",
  portfolio_pending: "Falta portfólio",
  rose_review_pending: "Revisão da Rose pendente",
  ready_for_final_review: "Pronto p/ revisão final",
  ready_for_publication: "Pronto p/ publicação",
};
const PENDENCY_LABEL: Record<string, string> = {
  content_review_pending: "conteúdo",
  classification_decision_pending: "classificação",
  price_pending: "preço",
  deadline_pending: "prazo comercial",
  portfolio_pending: "portfólio",
  rose_review_pending: "revisão Rose",
};

export default function AdminProdutosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [overview, setOverview] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; categories: any[] }>({ pillars: [], categories: [] });
  // ?produto=<id> abre o construtor direto (deep link preservado do redirect
  // de /admin/produtos/novo-catalogo e de qualquer link externo).
  const [openProductId, setOpenProductId] = useState<string | null>(() => searchParams.get("produto"));
  // ?ver=<id> abre o DETALHE completo (só leitura) — ação separada do
  // construtor (?produto=<id>). Ícone de olho → detalhe; ícone de lápis →
  // construtor (reparo 2026-09, "não abra o construtor quando a ação
  // escolhida for apenas visualizar").
  const [viewProductId, setViewProductId] = useState<string | null>(() => searchParams.get("ver"));

  const openProduct = useCallback((id: string | null) => {
    setOpenProductId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("produto", id);
      else next.delete("produto");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const viewProduct = useCallback((id: string | null) => {
    setViewProductId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("ver", id);
      else next.delete("ver");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // filtros/listagem (preservados ao voltar do editor)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [origin, setOrigin] = useState("");
  const [roseReviewed, setRoseReviewed] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [pendency, setPendency] = useState("");
  // Aba rápida "Com pendências" — estado PRÓPRIO, independente de
  // `showCategoryFilters` (bug real: antes as duas abas reusavam o mesmo
  // booleano, então "Com pendências" só reabria "Categorias" e nunca
  // filtrava nada — ver teste "bug real: Com pendências").
  const [onlyPendencies, setOnlyPendencies] = useState(false);
  const [sort, setSort] = useState("name");
  const [importSummary, setImportSummary] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  // Lista/Grade — preferência isolada desta tela, persistida em localStorage
  // (mesma convenção do layout anterior; restaurada 2026-09).
  const [gridMode, setGridMode] = usePersistedViewMode("admin-produtos", "list");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [list, setList] = useState<{ data: any[]; total: number; page_size: number } | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const [ov, pil, cat, imp, rdy] = await Promise.all([
        apiClient.getCatalog2Overview(),
        apiClient.getCatalog2Pillars(),
        apiClient.getCatalog2Categories(),
        apiClient.getCatalog2ImportSummary().catch(() => null),
        apiClient.getCatalog2Readiness().catch(() => null),
      ]);
      setOverview(ov);
      setRefs({ pillars: pil.data, categories: cat.data });
      setImportSummary(imp);
      setReadiness(rdy);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);
  useEffect(() => { void bootstrap(); }, [bootstrap]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await apiClient.getCatalog2Products({
        q, status, pillar_id: pillarId, category_id: categoryId,
        origin, rose_reviewed: roseReviewed, review_state: reviewState, pendency,
        has_pendencies: onlyPendencies ? "true" : undefined,
        sort, page, page_size: pageSize,
      });
      setList(r);
    } catch {
      setList({ data: [], total: 0, page_size: pageSize });
    } finally {
      setListLoading(false);
    }
  }, [q, status, pillarId, categoryId, origin, roseReviewed, reviewState, pendency, onlyPendencies, sort, page]);

  useEffect(() => {
    if (state !== "ready" || openProductId || viewProductId) return;
    const t = setTimeout(loadList, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [state, openProductId, viewProductId, loadList, q]);

  useEffect(() => setPage(1), [q, status, pillarId, categoryId, origin, roseReviewed, reviewState, pendency, onlyPendencies, sort]);

  async function rowAction(fn: () => Promise<any>, ok: string) {
    setMsg(null);
    try { await fn(); setMsg(ok); await loadList(); await bootstrap(); }
    catch (e: any) { setMsg(e?.message ?? "Falha."); }
  }

  async function createProduct() {
    setMsg(null);
    try {
      const name = window.prompt("Nome interno do produto:");
      if (!name) return;
      const p = await apiClient.createCatalog2Product({ internal_name: name });
      await bootstrap();
      openProduct(p.id);
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao criar.");
    }
  }

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
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-red-50 p-4 dark:bg-red-950/40">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">Erro ao carregar produtos</h2>
            <p className="max-w-sm text-sm text-muted-foreground">Não foi possível carregar o catálogo agora.</p>
          </div>
          <Button onClick={() => { setState("loading"); void bootstrap(); }}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.page_size)) : 1;
  const c = overview.counts;
  // /readiness traz task_count/price_amount reais (mesmos usados no painel de
  // prontidão) — indexado por id pra casar com a página atual da listagem.
  const readinessById: Record<string, any> = {};
  for (const rp of readiness?.products ?? []) readinessById[rp.id] = rp;
  const advancedFilters = [pillarId, categoryId, origin, roseReviewed, reviewState, pendency].filter(Boolean).length;

  // Abas de filtro rápido — mesma ideia do layout anterior aprovado
  // (filtram a tabela direto, sem precisar abrir "Mais filtros"), adaptadas
  // aos estados reais do catalog2 (em vez de "Ativos"/"Com tarefas" do
  // catálogo antigo, que não existem aqui).
  const quickTabs = [
    {
      key: "all", label: "Todos os produtos", icon: Package, count: c.final_imported_products ?? c.imported_products ?? 0,
      active: status === "" && !onlyPendencies && !showCategoryFilters,
      onClick: () => { setStatus(""); setOnlyPendencies(false); setShowCategoryFilters(false); },
    },
    {
      key: "published", label: "Publicados", icon: CheckCircle2, count: c.products_published ?? 0,
      active: status === "disponivel" && !onlyPendencies,
      onClick: () => { setStatus("disponivel"); setOnlyPendencies(false); setShowCategoryFilters(false); },
    },
    {
      key: "preparing", label: "Em preparação", icon: ClockIcon, count: c.products_in_preparation ?? 0,
      active: status === "em_preparacao" && !onlyPendencies,
      onClick: () => { setStatus("em_preparacao"); setOnlyPendencies(false); setShowCategoryFilters(false); },
    },
    {
      // Bug real corrigido (reparo 2026-09): esta aba reusava o mesmo estado
      // de "Categorias" e nunca filtrava nada — cada aba agora tem estado
      // próprio e independente.
      key: "pendencies", label: "Com pendências", icon: ListChecks, count: c.products_with_pendencies ?? 0,
      active: onlyPendencies,
      onClick: () => { setOnlyPendencies(true); setStatus(""); setShowCategoryFilters(false); },
    },
    {
      key: "categories", label: "Categorias", icon: Layers, count: refs.categories.length,
      active: showCategoryFilters,
      onClick: () => { setShowCategoryFilters((v) => !v); setOnlyPendencies(false); },
    },
  ] as const;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative flex h-full min-h-[70vh] flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Package}
            title="Cadastro de Produtos"
            description="Cadastre, edite e organize os produtos e serviços da plataforma (catalog2)"
            actions={
              <>
                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        data-tour-id="catalog2-admin-create"
                        onClick={() => setConfirm({ title: "Criar produto", message: "Um novo produto (em preparação) com uma versão rascunho será criado.", onConfirm: () => createProduct() })}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/70 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Novo Produto
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>Criar novo produto catalog2</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <a
                  href="/admin/catalog2?preview=1"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-white/70 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Pré-visualizar como cliente
                </a>
                <PinToTrayButton id="page-produtos" label="Cadastro de Produtos" icon={Package} path="/admin/produtos" />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto" data-tour-id="catalog2-admin-header">
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              Estes são os produtos da plataforma, ainda <strong>em preparação</strong> na maioria dos casos. O
              catálogo antigo, com 162 produtos, não aparece mais aqui — ele segue no banco só para não quebrar
              projetos antigos já ligados a ele.
            </p>

            {/* Abas-filtro rápido — mesmo padrão visual do layout anterior. */}
            <div className="mb-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
              <div className="flex flex-wrap items-center">
                {quickTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={`relative flex h-14 items-center gap-2 border-r border-slate-100 px-4 text-sm font-medium transition-colors last:border-r-0 dark:border-slate-800 ${
                      tab.active
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    <span className={`ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${tab.active ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {tab.count}
                    </span>
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-blue-500 transition-transform ${tab.active ? "scale-x-100" : "scale-x-0"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Indicadores gerais — vêm de overview.counts (dados reais). */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
              <Stat k="Importados (finais)" v={c.final_imported_products ?? c.imported_products ?? 0}
                hint={`não conta os 162 operacionais${c.test_local_products ? ` · + ${c.test_local_products} de demonstração, fora da contagem` : ""}`} />
              <Stat k="Tarefas (nos importados)" v={c.tasks_in_final_imported ?? 0} hint={`${c.tasks ?? 0} no catálogo todo`} />
              <Stat k="Etapas (nos importados)" v={c.steps_in_final_imported ?? 0} hint={`${c.steps ?? 0} no catálogo todo`} />
            </div>

            {importSummary?.has_import && (
              <details className="rounded-lg border">
                <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <h2 className="text-sm font-semibold text-foreground">Importação de produtos definitivos</h2>
                  <span className="text-xs text-muted-foreground">
                    {importSummary.count_matches_expected
                      ? `✓ ${importSummary.total_imported}/${importSummary.expected ?? importSummary.total_imported} importados`
                      : `⚠ ${importSummary.total_imported}/${importSummary.expected ?? importSummary.total_imported} importados`}
                    {" · "}{importSummary.published_count} publicado(s)
                  </span>
                </summary>
                <div className="space-y-2 border-t p-3 text-muted-foreground">
                  <p className="text-xs">
                    {overview.import?.message ??
                      `${overview.counts.final_imported_products ?? importSummary.total_imported} produto(s) importado(s) para preparação. Aguardando tarefas, prazos, precificação e revisão para publicação.`}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <SummaryCell k="Revisados pela Rose" v={`${importSummary.rose_reviewed} / ${importSummary.total_imported}`} />
                    <SummaryCell k="Sem revisão da Rose" v={importSummary.not_rose_reviewed} />
                    <SummaryCell k="Decisões pendentes" v={importSummary.decisions_pending} />
                    <SummaryCell k="Editados por humano" v={importSummary.human_edited} />
                  </div>
                  <p className="text-[11px]">
                    Fonte principal <code>{importSummary.last_batch?.source_main?.name}</code> · checksum{" "}
                    <code>{String(importSummary.last_batch?.source_main?.checksum ?? "").slice(0, 12)}…</code> · regra{" "}
                    {importSummary.last_batch?.rule_version} · lote {importSummary.last_batch?.status}. Os 162 produtos
                    operacionais seguem intactos.
                  </p>
                </div>
              </details>
            )}

            {readiness && <ReadinessPanel readiness={readiness} />}

            <Card className="overflow-hidden border border-slate-200/70 shadow-sm dark:border-slate-700/60">
              {/* Row 1 — busca + filtros + ordenar */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-slate-50/60 px-4 py-3.5 dark:border-slate-700/60 dark:bg-slate-900/30">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou slug"
                    aria-label="Buscar produtos"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-9 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <Button
                  onClick={() => setShowCategoryFilters((v) => !v)}
                  variant="outline"
                  size="sm"
                  className={`h-9 gap-2 px-3.5 text-xs ${advancedFilters > 0 ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {advancedFilters > 0 && (
                    <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">{advancedFilters}</span>
                  )}
                </Button>
                <label className="sr-only" htmlFor="f-sort">Ordenar</label>
                <select id="f-sort" className={SELECT_CLS} value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="name">Ordenar: Nome A–Z</option>
                  <option value="name_desc">Ordenar: Nome Z–A</option>
                  <option value="updated">Ordenar: Alterado recentemente</option>
                  <option value="created">Ordenar: Criado recentemente</option>
                </select>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                  {list ? `${list.total} ${list.total === 1 ? "item" : "itens"}` : ""}
                </span>
                <ProductViewModeToggle value={gridMode} onChange={setGridMode} />
              </div>

              {showCategoryFilters && (
                <div className="flex flex-wrap gap-2 border-b border-slate-200/70 p-3 dark:border-slate-700/60">
                  <label className="sr-only" htmlFor="f-status">Situação</label>
                  <select id="f-status" className={SELECT_CLS} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Todas as situações</option>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="f-pillar">Pilar</label>
                  <select id="f-pillar" className={SELECT_CLS} value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
                    <option value="">Todos os pilares</option>{refs.pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="f-cat">Categoria</label>
                  <select id="f-cat" className={SELECT_CLS} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Todas as categorias</option>{refs.categories.map((c2) => <option key={c2.id} value={c2.id}>{c2.name}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="f-origin">Origem</label>
                  <select id="f-origin" className={SELECT_CLS} value={origin} onChange={(e) => setOrigin(e.target.value)}>
                    <option value="">Toda origem</option>
                    <option value="existente">Só existentes</option>
                    <option value="novo">Só novos</option>
                    <option value="reativado">Só reativados</option>
                  </select>
                  <label className="sr-only" htmlFor="f-rose">Revisão da Rose</label>
                  <select id="f-rose" className={SELECT_CLS} value={roseReviewed} onChange={(e) => setRoseReviewed(e.target.value)}>
                    <option value="">Revisão da Rose (todas)</option>
                    <option value="true">Revisado pela Rose</option>
                    <option value="false">Sem revisão da Rose</option>
                  </select>
                  <label className="sr-only" htmlFor="f-review">Estado de preparo</label>
                  <select id="f-review" className={SELECT_CLS} value={reviewState} onChange={(e) => setReviewState(e.target.value)}>
                    <option value="">Estado de preparo (todos)</option>
                    {Object.entries(REVIEW_STATE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="f-pend">Tipo de pendência</label>
                  <select id="f-pend" className={SELECT_CLS} value={pendency} onChange={(e) => setPendency(e.target.value)}>
                    <option value="">Tipo de pendência (todas)</option>
                    {Object.entries(PENDENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}

              {/* Row — paginação (espelhada no rodapé) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-4 py-2 dark:border-slate-700/60 dark:bg-slate-900/30">
                <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
                {totalPages > 1 && <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />}
              </div>

              {msg && <p className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400">{msg}</p>}

              {listLoading ? (
                <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
              ) : !list || list.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-20">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-purple-100 shadow-sm">
                    <Package className="h-9 w-9 text-blue-500" />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold">Nenhum produto encontrado</h3>
                  <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                    {overview.is_empty ? overview.empty_message : "Tente ajustar os filtros ou a busca para encontrar o que procura."}
                  </p>
                </div>
              ) : gridMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/60 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/30">
                        <th className="w-12 px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">#</th>
                        <th className="w-12 px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">Img</th>
                        <th className="px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">Produto</th>
                        <th className="hidden px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400 sm:table-cell">Categoria</th>
                        <th className="hidden px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400 lg:table-cell">Tarefas</th>
                        <th className="hidden px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400 lg:table-cell">Preço</th>
                        <th className="hidden px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400 md:table-cell">Pendências</th>
                        <th className="px-2 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">Status</th>
                        <th className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {list.data.map((p) => {
                        const readyLabel = p.imported
                          ? (p.review_state === "ready_for_final_review" ? "Pronto p/ revisão final" : (REVIEW_STATE_LABEL[p.review_state] ?? "Em preparação"))
                          : null;
                        const pend: string[] = p.pendencies ?? [];
                        const rp = readinessById[p.id];
                        const realTaskCount: number | undefined = rp?.task_count;
                        const realPrice: number | null | undefined = rp?.price_amount;
                        // Fonte ÚNICA de provisório: a camada do backend
                        // (Catalog2ProvisionalPreview, via p.provisional_preview). O
                        // hash local (lib/catalog2-provisional.ts) só entra se o
                        // produto não tiver nenhum preview provisório gravado.
                        const pv = p.provisional_preview;
                        const taskProv = pv ? { value: pv.included_items_count, label: "Estrutura provisória — completar" } : provisionalTaskCount(p.id);
                        const priceProv = pv?.price_amount != null ? { value: pv.price_amount, label: "Preço provisório — revisar.", is_provisional: true as const } : provisionalPrice(p.id);
                        const tech = [
                          `slug ${p.slug}`,
                          p.source_index ? `origem #${p.source_index}` : null,
                          p.origin || null,
                          p.published_version_number ? `v${p.published_version_number} publicada` : "sem versão publicada",
                          p.has_draft ? "rascunho aberto" : null,
                          p.published_at ? `publicado ${new Date(p.published_at).toLocaleDateString("pt-BR")}` : null,
                          `alterado ${new Date(p.updated_at).toLocaleDateString("pt-BR")}`,
                        ].filter(Boolean).join(" · ");
                        return (
                          <tr key={p.id} className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-2 py-3">
                              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{p.source_index ?? "—"}</span>
                            </td>
                            <td className="px-2 py-3">
                              <Catalog2Thumbnail productId={p.id} imagePath={p.provisional_preview?.image_path} size="sm" showBadge={false} />
                            </td>
                            <td className="px-2 py-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <button className="text-left text-[13px] font-semibold leading-tight hover:underline" onClick={() => viewProduct(p.id)}>
                                    {p.internal_name}
                                  </button>
                                  <code className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-400 dark:bg-slate-800" title="Slug catalog2 (não é código legado)">
                                    {p.slug}
                                  </code>
                                </div>
                                <p className="max-w-[260px] truncate text-[11px] text-muted-foreground" title={p.summary ?? undefined}>
                                  {p.summary || "Resumo ainda não escrito"}
                                </p>
                                <p className="max-w-[280px] truncate text-[11px] text-muted-foreground">
                                  {readyLabel ? readyLabel : "Sem revisão de preparo ainda"}
                                  {p.imported ? ` · ${pend.length} pendência(s)` : ""}
                                </p>
                                <RowTechDetails text={tech} />
                              </div>
                            </td>
                            <td className="hidden px-2 py-3 sm:table-cell">
                              <Badge variant="outline">{p.category?.name ?? "Sem categoria"}</Badge>
                            </td>
                            <td className="hidden px-2 py-3 lg:table-cell">
                              <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                                {realTaskCount != null && realTaskCount > 0 ? (
                                  <span>{realTaskCount} tarefa(s)</span>
                                ) : (
                                  <>
                                    <span className="text-slate-400">{taskProv.value} tarefa(s)</span>
                                    <ProvisionalBadge label={taskProv.label + " Pendência real de tarefas continua registrada."} />
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="hidden px-2 py-3 text-right lg:table-cell">
                              {realPrice != null ? (
                                <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                                  R$ {realPrice.toFixed(2)}
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[13px] font-semibold text-slate-400">R$ {priceProv.value.toFixed(2)}</span>
                                  <ProvisionalBadge label={priceProv.label + " Não é comercialmente válido — nunca usado em cotação, checkout ou publicação."} />
                                </div>
                              )}
                            </td>
                            <td className="hidden px-2 py-3 md:table-cell">
                              {pend.length === 0 && !!p.rose_reviewed !== false && !p.human_edited ? (
                                <span className="text-[11px] text-muted-foreground">nenhuma</span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1">
                                  {!p.rose_reviewed && <Badge className="bg-muted text-muted-foreground">Rose pendente</Badge>}
                                  {p.human_edited && <Badge className="bg-muted text-muted-foreground">editado por humano</Badge>}
                                  {pend.slice(0, 3).map((pk: string) => (
                                    <Badge key={pk} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{PENDENCY_LABEL[pk] ?? pk}</Badge>
                                  ))}
                                  {pend.length > 3 && <span className="text-[11px] text-muted-foreground">+{pend.length - 3}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1.5">
                                {p.is_new && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Novo</Badge>}
                                <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider delayDuration={400}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => viewProduct(p.id)}
                                        aria-label="Ver detalhe completo"
                                        className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:border-transparent hover:bg-slate-800 hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-medium">Ver detalhe completo</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={400}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => openProduct(p.id)}
                                        aria-label={p.has_draft ? "Continuar configuração" : "Abrir/editar produto"}
                                        className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-[#6E2C96] shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:border-transparent hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-medium">{p.has_draft ? "Continuar configuração" : "Abrir/editar produto"}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <ProductRowActionsMenu p={p} rowAction={rowAction} setConfirm={setConfirm} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-4 ${viewModeGridClass(gridMode)}`}>
                  {list.data.map((p) => {
                    const readyLabel = p.imported
                      ? (p.review_state === "ready_for_final_review" ? "Pronto p/ revisão final" : (REVIEW_STATE_LABEL[p.review_state] ?? "Em preparação"))
                      : null;
                    const pend: string[] = p.pendencies ?? [];
                    const isCompact = gridMode === 4 || gridMode === 5;
                    return (
                      <Card key={p.id} className="group flex flex-col overflow-hidden border border-slate-200/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => viewProduct(p.id)}
                          className={`relative flex w-full shrink-0 items-center justify-center overflow-hidden ${isCompact ? "h-20" : "h-28"}`}
                        >
                          {p.provisional_preview?.image_path ? (
                            <img src={p.provisional_preview.image_path} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-500 to-violet-600">
                              <Package className={isCompact ? "h-6 w-6 text-white/90" : "h-9 w-9 text-white/90"} />
                            </div>
                          )}
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            {p.is_new && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Novo</Badge>}
                            <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                          </div>
                          {p.provisional_preview?.image_path && (
                            <div className="absolute left-2 bottom-2">
                              <ProvisionalBadge label="Imagem provisória — reaproveitada para visualização, substituir pela imagem definitiva." />
                            </div>
                          )}
                        </button>
                        <div className="flex flex-1 flex-col gap-2 p-3">
                          <button className="text-left text-[13px] font-semibold leading-tight hover:underline" onClick={() => viewProduct(p.id)}>
                            {p.internal_name}
                          </button>
                          {!isCompact && (
                            <p className="text-[11px] text-muted-foreground">
                              {readyLabel ? readyLabel : "Sem revisão de preparo ainda"}
                              {p.imported ? ` · ${pend.length} pendência(s)` : ""}
                            </p>
                          )}
                          <Badge variant="outline" className="w-fit">{p.category?.name ?? "Sem categoria"}</Badge>
                          <div className="mt-auto flex items-center justify-between gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => viewProduct(p.id)} aria-label="Ver detalhe completo">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Ver detalhe completo</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => openProduct(p.id)} aria-label={p.has_draft ? "Continuar configuração" : "Abrir/editar produto"}>
                                    <Pencil className="h-3 w-3" /> {isCompact ? "" : "Abrir"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">{p.has_draft ? "Continuar configuração" : "Abrir/editar produto"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <ProductRowActionsMenu p={p} rowAction={rowAction} setConfirm={setConfirm} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {list && list.data.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-2.5 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{list.total} produto{list.total === 1 ? "" : "s"}</span>
                  {totalPages > 1 && <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />}
                </div>
              )}
            </Card>
          </div>
        </div>

        {confirm && (
          <ConfirmationDialog
            open
            onClose={() => setConfirm(null)}
            title={confirm.title}
            message={confirm.message}
            confirmText="Confirmar"
            destructive={false}
            onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          />
        )}

        {/* O construtor abre AQUI DENTRO — container padrão, cabeçalho padrão,
            fechar/fixar na bandeja — nunca como área separada ("Novo
            Catálogo"/"Preparação de Produtos"). Reunião 2026-09. */}
        <EmbeddedSlideScreen
          open={!!openProductId}
          onClose={() => { openProduct(null); void loadList(); void bootstrap(); }}
          title="Editor de produto"
          pin={openProductId ? {
            id: `catalog2-produto-${openProductId}`,
            label: "Editor de produto",
            icon: Package,
            path: `/admin/produtos?produto=${openProductId}`,
          } : undefined}
        >
          {openProductId && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {(() => {
                const rp = readinessById[openProductId];
                const hasProvisional = rp && (!(rp.task_count > 0) || rp.price_amount == null);
                return hasProvisional ? (
                  <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Este produto tem campos provisórios (preço, prazo e/ou tarefas de demonstração) — veja o
                      resumo completo no Catálogo de Produtos administrativo antes de publicar.
                    </span>
                  </div>
                ) : null;
              })()}
              <ProductEditor productId={openProductId} onBack={() => { openProduct(null); void loadList(); void bootstrap(); }} />
            </div>
          )}
        </EmbeddedSlideScreen>

        {/* Detalhe comercial completo (só leitura) — ação do ícone de olho,
            SEPARADA do construtor. Mesma convenção de container/bandeja. */}
        <EmbeddedSlideScreen
          open={!!viewProductId}
          onClose={() => viewProduct(null)}
          title="Detalhe do produto"
          pin={viewProductId ? {
            id: `catalog2-detalhe-${viewProductId}`,
            label: "Detalhe do produto",
            icon: Eye,
            path: `/admin/produtos?ver=${viewProductId}`,
          } : undefined}
        >
          {viewProductId && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <Catalog2ProductDetail
                productId={viewProductId}
                onBack={() => viewProduct(null)}
                onOpenEditor={() => { const id = viewProductId; viewProduct(null); openProduct(id); }}
              />
            </div>
          )}
        </EmbeddedSlideScreen>
      </div>
    </div>
  );
}

// Select padrão — superfície sólida, borda e texto por token (contraste alto
// nos dois temas).
const SELECT_CLS =
  "rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Paginação numerada — mesmo desenho do layout anterior aprovado (setas +
// números + salto direto de página), sem o campo de "ir para" (dispensável
// no volume atual de produtos catalog2).
function PaginationControls({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages = getPageNumbers(page, totalPages);
  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        title="Página anterior"
        className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-0.5 text-xs text-slate-300">·</span>
        ) : (
          <button
            key={i}
            onClick={() => onChange(Number(p))}
            className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-bold transition-colors ${p === page ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            style={p === page ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        title="Próxima página"
        className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
function getPageNumbers(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  if (page > 3) out.push("...");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) out.push(p);
  if (page < totalPages - 2) out.push("...");
  out.push(totalPages);
  return out;
}

// Detalhe técnico da linha (slug, origem, versões, datas) — fora da leitura
// principal, atrás de um botão acessível por teclado. Recuperado da
// reformulação de 10/09 (9539f94/823b18c) — tinha sumido quando a lista
// virou tabela no reparo de layout.
function RowTechDetails({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      <button type="button" aria-expanded={open} className="underline decoration-dotted" onClick={() => setOpen((o) => !o)}>
        Detalhes técnicos
      </button>
      {open && <div className="mt-0.5">{text}</div>}
    </div>
  );
}

// Indicador — sem card colorido; célula neutra dentro de um painel único.
// Ações secundárias por produto — compartilhado entre Lista e Grade (só
// muda o gatilho visual ao redor). Nunca inclui "Excluir": catalog2 não tem
// exclusão — arquivar é o equivalente real, já usado aqui.
function ProductRowActionsMenu({
  p, rowAction, setConfirm,
}: {
  p: any;
  rowAction: (fn: () => Promise<any>, ok: string) => void;
  setConfirm: (c: { title: string; message: string; onConfirm: () => void } | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {p.published_version_number && !p.has_draft && (
          <DropdownMenuItem onClick={() => rowAction(() => apiClient.newCatalog2Version(p.id), "Nova versão rascunho criada.")}>
            Nova versão
          </DropdownMenuItem>
        )}
        {p.status === "disponivel" && (
          <DropdownMenuItem onClick={() => rowAction(() => apiClient.setCatalog2ProductStatus(p.id, "temporariamente_inativo"), "Oferta suspensa.")}>
            Suspender
          </DropdownMenuItem>
        )}
        {p.status === "temporariamente_inativo" && (
          <DropdownMenuItem onClick={() => rowAction(() => apiClient.setCatalog2ProductStatus(p.id, "disponivel"), "Oferta reativada.")}>
            Ativar
          </DropdownMenuItem>
        )}
        {p.status !== "arquivado" && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setConfirm({ title: "Arquivar produto?", message: "O produto sai do catálogo. O histórico é preservado; nada é apagado.", onConfirm: () => rowAction(() => apiClient.archiveCatalog2Product(p.id), "Produto arquivado.") })}
          >
            Arquivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stat({ k, v, hint, tone }: { k: string; v: number | string; hint?: string; tone?: "ok" | "warn" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn" ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";
  return (
    <div className="bg-card p-3">
      <div className={`text-lg font-semibold ${toneCls}`}>{v}</div>
      <div className="text-xs text-muted-foreground">{k}</div>
      {hint && <div className="text-[10px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}
function SummaryCell({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="rounded border bg-background px-2 py-1">
      <div className="font-semibold text-foreground">{v}</div>
      <div className="text-[10px] text-muted-foreground">{k}</div>
    </div>
  );
}
function ReadinessPanel({ readiness }: { readiness: any }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="rounded-lg border">
      <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">Prontidão para o catálogo do cliente</h2>
        <span className="text-xs text-muted-foreground">
          {readiness.ready_for_client}/{readiness.total} prontos · {readiness.client_visible_now} visíveis agora ·{" "}
          {readiness.with_blockers} com bloqueador
        </span>
      </summary>
      <div className="space-y-2 border-t p-3">
        <p className="text-[11px] text-muted-foreground">{readiness.note}</p>
        <button className="text-xs font-medium text-foreground underline" onClick={() => setOpen((o) => !o)}>
          {open ? "Ocultar detalhamento" : "Ver detalhamento por produto"}
        </button>
        {open && (
          <div className="max-h-80 overflow-y-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-1.5">#</th><th className="p-1.5">Produto</th>
                  <th className="p-1.5">Bloqueadores</th><th className="p-1.5">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {readiness.products.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-1.5 text-muted-foreground">{p.source_index ?? "—"}</td>
                    <td className="p-1.5 text-foreground">{p.name}</td>
                    <td className="p-1.5">
                      {p.blockers.length === 0
                        ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">nenhum</Badge>
                        : p.blockers.map((b: string) => <Badge key={b} className="mr-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{b}</Badge>)}
                    </td>
                    <td className="p-1.5">
                      {p.pendings.map((b: string) => <Badge key={b} className="mr-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{b}</Badge>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{children}</div>;
}
